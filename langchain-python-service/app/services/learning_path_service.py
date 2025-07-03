import asyncio
import re
import json
from typing import Dict, List, Any, Optional
from loguru import logger
from langchain_core.messages import HumanMessage

from app.models.llm_config import LLMConfig
from app.prompts.learning_path_prompts import (
    AGENT_A_INTERPRETER_PROMPT,
    TEXT_OUTLINER_PROMPT,
    FINAL_JSON_AGENT_PROMPT,
    JSON_CONVERTER_PROMPT,
    AGENT_C_METADATA_PROMPT
)
from app.models.learning_path import LearningNode
from app.services.cache_manager import cache_manager
from app.services.model_router_service import model_router
from app.prompts.domain_methodologies import DOMAIN_METHODOLOGY_MAP, DEFAULT_METHODOLOGY
from app.config.model_router_config import Domain

# Removed _is_draft_valid as it's no longer needed with new text->JSON approach

class LearningPathService:
    """Service to orchestrate the generation of a learning path."""

    _PROFICIENCY_GUIDANCE = {
        "Beginner": "This user is a complete beginner. Start with fundamental concepts, avoid jargon, use simple analogies, and include a 'Prerequisites' section if applicable.",
        "Intermediate": "This user has some foundational knowledge. Focus on practical applications, best practices, and comparisons between different approaches. Assume they understand the basics.",
        "Expert": "This user is experienced. Focus on advanced topics, architectural patterns, performance optimization, and in-depth case studies. Challenge them with complex problems.",
    }

    async def generate_path(self, user_request: str, quality_level: str = "standard") -> str:
        """
        Orchestrates agents to generate a learning path and returns the raw JSON string.
        """
        cache_key = f"learning_path_v3_raw:{hash(user_request.lower().strip())}:{quality_level}"
        cached_path = await cache_manager.get_json(cache_key)
        if cached_path:
            logger.success(f"Cache HIT for raw learning path. Key: {cache_key}")
            return json.dumps(cached_path)

        logger.info(f"Cache MISS. Starting learning path generation for request: '{user_request[:50]}...'")

        # 1. Agent A: Interpret the user's request
        analysis = await self._run_agent_a_interpreter(user_request)
        logger.info(f"Agent A analysis complete: {analysis}")

        # 2. Determine Domain, Methodology, and Guidance
        _ , detected_domain = model_router.select_model(
            user_message=analysis['requirement'],
            topic_title=analysis['topic']
        )
        domain_methodology = DOMAIN_METHODOLOGY_MAP.get(detected_domain, DEFAULT_METHODOLOGY)
        proficiency_guidance = self._PROFICIENCY_GUIDANCE.get(analysis.get("level", "Intermediate"), "")

        # 3. Agent B: Generate text outline
        text_outline = await self._run_text_outliner_agent(analysis, domain_methodology, proficiency_guidance)
        logger.info("Text Outliner Agent finished. Raw outline has been created.")

        # 4. Final Agent: Generate the complete JSON string from all context
        final_json_string = await self._run_final_json_agent(analysis, text_outline)
        logger.info("Final JSON Agent finished. Raw JSON string has been created.")

        # Validate that the output is valid JSON before caching and returning
        try:
            parsed_json = json.loads(final_json_string)
            await cache_manager.set_json(cache_key, parsed_json, ttl=86400)
            logger.success(f"Learning path generation complete. Output is valid JSON and has been cached.")
        except json.JSONDecodeError as e:
            logger.error(f"CRITICAL: Final JSON Agent produced invalid JSON. Error: {e}")
            logger.error(f"Raw output from agent was:\n{final_json_string}")
            raise ValueError("The final agent failed to produce a valid JSON structure.") from e

        return final_json_string
    
    async def _run_agent_a_interpreter(self, user_request: str) -> Dict[str, str]:
        """Runs Agent A to interpret the request and extract key fields as JSON."""
        prompt = AGENT_A_INTERPRETER_PROMPT.format(user_request=user_request)
        llm = LLMConfig.get_llm(model_name="google/gemini-2.0-flash-lite-001", temperature=0.0, max_tokens=512)
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        content = str(response.content)

        try:
            # Clean the response to ensure it's a valid JSON string
            cleaned_content = re.sub(r"```json\n?|```", "", content).strip()
            analysis = json.loads(cleaned_content)
            
            # Validate the structure
            required_keys = ['topic', 'requirement', 'language', 'level']
            if not isinstance(analysis, dict) or not all(k in analysis for k in required_keys):
                raise ValueError(f"JSON output from Agent A is missing required keys. Got: {analysis.keys()}")

            return analysis
        except json.JSONDecodeError as e:
            logger.error(f"Agent A returned invalid JSON: {content}")
            raise ValueError(f"Agent A returned malformed output: {content}") from e

    async def _run_text_outliner_agent(self, analysis: Dict, domain_methodology: str, proficiency_guidance: str) -> str:
        """Runs Agent B (Text Outliner) to generate a comprehensive text outline."""
        prompt = TEXT_OUTLINER_PROMPT.format(
            topic=analysis['topic'],
            requirement=analysis['requirement'],
            language=analysis['language'],
            domain_methodology=domain_methodology,
            proficiency_guidance=proficiency_guidance
        )
        llm = LLMConfig.get_llm(model_name="google/gemini-2.5-flash", temperature=0.4, max_tokens=4096)
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        
        text_outline = str(response.content).strip()
        if not text_outline:
            raise ValueError("Text Outliner Agent returned empty content")
        
        return text_outline
        
    async def _run_final_json_agent(self, analysis: dict, text_outline: str) -> str:
        """Runs the Final JSON Agent to produce the complete raw JSON string."""
        prompt = FINAL_JSON_AGENT_PROMPT.format(
            topic=analysis['topic'],
            requirement=analysis['requirement'],
            language=analysis['language'],
            text_outline=text_outline
        )
        # Use a powerful and reliable model for this critical final step
        llm = LLMConfig.get_llm(model_name="openai/gpt-4o-mini", temperature=0.05, max_tokens=8192)
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        
        # Return the raw, cleaned string content
        return re.sub(r"```json\n?|```", "", str(response.content)).strip()
        
    def _summarize_json_for_prompt(self, data: Any, indent: str = "") -> str:
        # This function is now DEPRECATED as metadata is part of the final agent.
        return "" # Return empty string instead of None to match return type