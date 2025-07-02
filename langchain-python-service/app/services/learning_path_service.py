import asyncio
import re
import json
from typing import Dict, List, Any, Optional
from loguru import logger
from langchain_core.messages import HumanMessage

from app.models.llm_config import LLMConfig
from app.prompts.learning_path_prompts import (
    AGENT_A_INTERPRETER_PROMPT,
    DRAFTER_AGENT_PROMPT,
    QA_REFINER_AGENT_PROMPT,
    AGENT_C_METADATA_PROMPT
)
from app.models.learning_path import LearningNode
from app.services.cache_manager import cache_manager
from app.services.model_router_service import model_router
from app.prompts.domain_methodologies import DOMAIN_METHODOLOGY_MAP, DEFAULT_METHODOLOGY
from app.config.model_router_config import Domain

def _is_draft_valid(draft_json: Any) -> bool:
    """
    Performs a quick, non-exhaustive check to see if the draft from Agent B is usable.
    Checks for basic structure and hierarchy.
    """
    if not isinstance(draft_json, list) or not draft_json:
        return False
    
    # Check if there is at least one level of nesting
    first_node = draft_json[0]
    if not isinstance(first_node, dict) or "children" not in first_node:
        return False
        
    if isinstance(first_node["children"], list) and first_node["children"]:
        second_node = first_node["children"][0]
        if isinstance(second_node, dict) and "children" in second_node:
            # Found at least two levels of nesting, likely okay.
            return True

    # If we reach here, it's likely a flat list.
    return False

class LearningPathService:
    """Service to orchestrate the generation of a learning path."""

    _PROFICIENCY_GUIDANCE = {
        "Beginner": "This user is a complete beginner. Start with fundamental concepts, avoid jargon, use simple analogies, and include a 'Prerequisites' section if applicable.",
        "Intermediate": "This user has some foundational knowledge. Focus on practical applications, best practices, and comparisons between different approaches. Assume they understand the basics.",
        "Expert": "This user is experienced. Focus on advanced topics, architectural patterns, performance optimization, and in-depth case studies. Challenge them with complex problems.",
    }

    async def generate_path(self, user_request: str, quality_level: str = "standard") -> Dict[str, Any]:
        """
        Generates a full learning path from a user request.
        Orchestrates agents for drafting, refining, and metadata generation.
        Includes caching to improve performance for repeated requests.
        """
        cache_key = f"learning_path_v2:{hash(user_request.lower().strip())}:{quality_level}"
        cached_path = await cache_manager.get_json(cache_key)
        if cached_path:
            logger.success(f"Cache HIT for learning path. Key: {cache_key}")
            return cached_path

        logger.info(f"Cache MISS. Starting learning path generation for request: '{user_request[:50]}...'")

        # 1. Agent A: Interpret the user's request and proficiency
        try:
            analysis = await self._run_agent_a_interpreter(user_request)
            logger.info(f"Agent A analysis complete: {analysis}")
        except Exception as e:
            logger.error(f"Agent A (Interpreter) failed: {e}")
            raise ValueError("Failed to interpret the user request.") from e
        
        # 2. Determine Domain, Methodology, and Guidance
        _ , detected_domain = model_router.select_model(
            user_message=analysis['requirement'],
            topic_title=analysis['topic']
        )
        
        domain_methodology = DOMAIN_METHODOLOGY_MAP.get(detected_domain, DEFAULT_METHODOLOGY)
        proficiency_guidance = self._PROFICIENCY_GUIDANCE.get(analysis.get("level", "Intermediate"), "")

        # 3. Generate the initial draft
        try:
            draft_outline_json = await self._run_drafter_agent(analysis, domain_methodology, proficiency_guidance)
            logger.info("Drafter Agent finished. Outline draft has been created.")
        except Exception as e:
            logger.error(f"Drafter Agent failed: {e}")
            raise ValueError("Failed to generate initial course content.") from e

        # 4. Quality Gate: Check the draft and repair if necessary
        if not _is_draft_valid(draft_outline_json):
            logger.warning("Draft quality is low. Triggering QA & Refiner Agent for repairs.")
            try:
                final_outline_json = await self._run_qa_refiner_agent(draft_outline_json)
                logger.info("QA & Refiner Agent finished repairing the outline.")
            except Exception as e:
                logger.error(f"QA & Refiner Agent failed during repair: {e}")
                raise ValueError("Failed to repair the course content.") from e
        else:
            logger.success("Draft quality is good. Skipping QA & Refiner Agent.")
            final_outline_json = draft_outline_json

        # 5. Run Metadata Agent *after* the outline is finalized
        try:
            # To avoid passing a huge JSON object to the metadata agent, we'll create a text summary.
            summary_for_metadata = self._summarize_json_for_prompt(final_outline_json)
            metadata = await self._run_metadata_agent(analysis, summary_for_metadata)
            logger.info("Metadata generation completed using final outline.")
        except Exception as e:
            logger.error(f"Metadata agent failed: {e}")
            raise ValueError("Failed to generate course metadata.") from e

        # 6. Python Logic: Parse the final JSON outline into a structured tree
        try:
            tree = self._parse_json_to_tree(final_outline_json)
            logger.info(f"Successfully parsed final outline into a tree with {len(tree)} nodes.")
        except Exception as e:
            logger.error(f"Failed to parse final outline JSON into a tree: {e}")
            raise ValueError("Failed to structure the course outline.") from e

        # 7. Final Assembly: Combine metadata and tree
        final_response = {**metadata, "tree": [node.model_dump() for node in tree]}
        
        await cache_manager.set_json(cache_key, final_response, ttl=86400) # Cache for 24 hours
        logger.success(f"Learning path generation complete and cached. Key: {cache_key}")
        
        return final_response
    
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

    async def _run_drafter_agent(self, analysis: Dict, domain_methodology: str, proficiency_guidance: str) -> Any:
        """Runs Agent B (Drafter) to generate the initial course outline as a JSON object."""
        prompt = DRAFTER_AGENT_PROMPT.format(
            topic=analysis['topic'],
            requirement=analysis['requirement'],
            language=analysis['language'],
            domain_methodology=domain_methodology,
            proficiency_guidance=proficiency_guidance
        )
        llm = LLMConfig.get_llm(model_name="google/gemini-2.5-flash", temperature=0.4, max_tokens=4096)
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        
        try:
            # Clean the response to ensure it's a valid JSON string
            cleaned_content = re.sub(r"```json\n?|```", "", str(response.content)).strip()
            return json.loads(cleaned_content)
        except json.JSONDecodeError as e:
            logger.error(f"Drafter Agent returned invalid JSON: {response.content}")
            raise ValueError("Drafter Agent returned malformed JSON.") from e
        
    async def _run_qa_refiner_agent(self, draft_outline_json: Any) -> Any:
        """Runs Agent C (QA) to refine the draft JSON outline."""
        prompt = QA_REFINER_AGENT_PROMPT.format(
            draft_outline=json.dumps(draft_outline_json, ensure_ascii=False, indent=2)
        )
        # Use a more powerful model for the critical refinement step
        llm = LLMConfig.get_llm(model_name="google/gemini-2.5-pro", temperature=0.2, max_tokens=4096)
        response = await llm.ainvoke([HumanMessage(content=prompt)])

        try:
            cleaned_content = re.sub(r"```json\n?|```", "", str(response.content)).strip()
            return json.loads(cleaned_content)
        except json.JSONDecodeError as e:
            logger.error(f"Refiner Agent returned invalid JSON: {response.content}")
            raise ValueError("Refiner Agent returned malformed JSON during repair.") from e

    async def _run_metadata_agent(self, analysis: Dict[str, str], final_outline_summary: str) -> Dict[str, str]:
        """Runs Metadata Agent based on a text summary of the final outline."""
        prompt = AGENT_C_METADATA_PROMPT.format(
            topic=analysis['topic'],
            requirement=analysis['requirement'],
            language=analysis['language'],
            final_outline=final_outline_summary
        )
        llm = LLMConfig.get_llm(model_name="google/gemini-2.5-flash", temperature=0.5, max_tokens=512)
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        
        try:
            cleaned_content = re.sub(r"```json\n?|```", "", str(response.content)).strip()
            metadata = json.loads(cleaned_content)
            if not isinstance(metadata, dict) or 'topicName' not in metadata or 'description' not in metadata:
                 raise ValueError("JSON output is missing required keys.")
            return metadata
        except json.JSONDecodeError as e:
            logger.error(f"Metadata Agent returned invalid JSON: {response.content}")
            raise ValueError("Failed to parse metadata JSON from Metadata Agent.") from e

    def _summarize_json_for_prompt(self, data: Any, indent: str = "") -> str:
        """Creates a simplified text summary of the JSON outline for the metadata agent."""
        summary = ""
        if isinstance(data, list):
            for i, item in enumerate(data[:5]): # Limit to first 5 items per level to keep it short
                summary += self._summarize_json_for_prompt(item, indent)
        elif isinstance(data, dict):
            summary += f"{indent}- {data.get('title', 'Untitled')}\n"
            if "children" in data:
                summary += self._summarize_json_for_prompt(data["children"], indent + "  ")
        return summary
        
    def _parse_json_to_tree(self, json_data: List[Dict]) -> List[LearningNode]:
        """
        Parses a nested JSON object from the AI into a flat list of LearningNode objects,
        and correctly sets up relationships (requires, next).
        """
        flat_nodes: List[LearningNode] = []
        
        # A recursive function to traverse the JSON and build the flat list
        def traverse(children: List[Dict], parent_id: Optional[str], parent_level: int, prefix: str):
            for i, item in enumerate(children):
                current_id = f"{prefix}{i + 1}"
                
                node = LearningNode(
                    temp_id=current_id,
                    title=item.get("title", "Untitled"),
                    description=item.get("description", ""),
                    level=parent_level + 1,
                    requires=[parent_id] if parent_id else [],
                    next=[],
                    is_chat_enabled=(not item.get("children")),
                    prompt_sample=item.get("prompt", "")
                )
                flat_nodes.append(node)

                if item.get("children"):
                    traverse(item["children"], current_id, parent_level + 1, f"{current_id}.")

        traverse(json_data, None, -1, "")
        
        # Create a map for efficient lookups
        node_map = {n.temp_id: n for n in flat_nodes}

        # Second pass: Build parent-child relationships (parent's 'next')
        for node in flat_nodes:
            if node.requires:
                parent_id = node.requires[0]
                if parent_id in node_map:
                    node_map[parent_id].next.append(node.temp_id)
        
        # Third pass: Finalize leaf nodes' 'next' pointers
        for i, node in enumerate(flat_nodes):
            if not node.next: # It's a leaf node
                # Find the "true" next sibling or cousin in the global list
                if i < len(flat_nodes) - 1:
                    node.next = [flat_nodes[i+1].temp_id]
        
        return flat_nodes 