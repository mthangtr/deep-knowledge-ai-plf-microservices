"""
Content-Aware Compression Module
Adaptive compression strategies based on content type để optimize token usage
"""

from typing import Dict, List, Optional, Tuple
from enum import Enum
import re
from loguru import logger

class ContentType(Enum):
    """Content types for adaptive compression"""
    CODE_EXPLANATION = "CODE_EXPLANATION"
    CONCEPT_QUESTION = "CONCEPT_QUESTION"
    CALCULATION_PROBLEM = "CALCULATION_PROBLEM"
    LANGUAGE_PRACTICE = "LANGUAGE_PRACTICE"
    CASE_STUDY = "CASE_STUDY"
    HISTORICAL_ANALYSIS = "HISTORICAL_ANALYSIS"
    CREATIVE_WORK = "CREATIVE_WORK"
    TROUBLESHOOTING = "TROUBLESHOOTING"
    GENERAL_DISCUSSION = "GENERAL_DISCUSSION"

class ContentCompressor:
    """Smart content compression với content-aware strategies"""
    
    def __init__(self):
        self.compression_strategies = {
            ContentType.CODE_EXPLANATION: self._compress_code_explanation,
            ContentType.CONCEPT_QUESTION: self._compress_concept_question,
            ContentType.CALCULATION_PROBLEM: self._compress_calculation,
            ContentType.LANGUAGE_PRACTICE: self._compress_language,
            ContentType.CASE_STUDY: self._compress_case_study,
            ContentType.HISTORICAL_ANALYSIS: self._compress_historical,
            ContentType.CREATIVE_WORK: self._compress_creative,
            ContentType.TROUBLESHOOTING: self._compress_troubleshooting,
            ContentType.GENERAL_DISCUSSION: self._compress_general
        }
        logger.info("Content Compressor initialized with adaptive strategies")
    
    def compress_content(self, content: str, max_tokens: int = 500) -> Tuple[str, Dict]:
        """Compress content intelligently based on detected type"""
        
        # Detect content type
        content_type = self._detect_content_type(content)
        
        # Apply appropriate compression strategy
        strategy = self.compression_strategies.get(
            content_type, 
            self._compress_general
        )
        
        compressed, metadata = strategy(content, max_tokens)
        
        # Add compression stats to metadata
        metadata.update({
            'original_length': len(content),
            'compressed_length': len(compressed),
            'compression_ratio': len(compressed) / len(content) if content else 0,
            'content_type': content_type.value,
            'estimated_tokens': len(compressed) // 4
        })
        
        logger.info(f"Compressed {content_type.value}: {len(content)} -> {len(compressed)} chars "
                   f"({metadata['compression_ratio']:.2%} of original)")
        
        return compressed, metadata
    
    def _detect_content_type(self, content: str) -> ContentType:
        """Detect content type using pattern matching"""
        
        content_lower = content.lower()
        
        # Code patterns
        if any(pattern in content for pattern in ['```', 'function', 'class', 'import', 'def', 'const', 'var']):
            return ContentType.CODE_EXPLANATION
        
        # Calculation patterns
        if re.search(r'\d+\s*[+\-*/=]\s*\d+|equation|formula|calculate|solve', content_lower):
            return ContentType.CALCULATION_PROBLEM
        
        # Language patterns
        if any(word in content_lower for word in ['grammar', 'vocabulary', 'pronunciation', 'translate']):
            return ContentType.LANGUAGE_PRACTICE
        
        # Case study patterns
        if any(phrase in content_lower for phrase in ['case study', 'example', 'scenario', 'real world']):
            return ContentType.CASE_STUDY
        
        # Historical patterns
        if any(word in content_lower for word in ['history', 'historical', 'timeline', 'century', 'period']):
            return ContentType.HISTORICAL_ANALYSIS
        
        # Creative patterns
        if any(word in content_lower for word in ['creative', 'art', 'design', 'poem', 'story']):
            return ContentType.CREATIVE_WORK
        
        # Troubleshooting patterns
        if any(word in content_lower for word in ['error', 'bug', 'issue', 'problem', 'fix', 'debug']):
            return ContentType.TROUBLESHOOTING
        
        # Question patterns
        if '?' in content or any(q in content_lower for q in ['what', 'how', 'why', 'when', 'where']):
            return ContentType.CONCEPT_QUESTION
        
        return ContentType.GENERAL_DISCUSSION
    
    def _compress_code_explanation(self, content: str, max_tokens: int) -> Tuple[str, Dict]:
        """Compress code explanations - preserve code blocks, compress text"""
        
        parts = []
        metadata = {'code_blocks_preserved': 0, 'text_compressed': 0}
        
        # Split by code blocks
        code_pattern = r'```[\s\S]*?```|`[^`]+`'
        code_blocks = re.findall(code_pattern, content)
        text_parts = re.split(code_pattern, content)
        
        current_tokens = 0
        max_chars = max_tokens * 4
        
        # Interleave text and code
        for i, text in enumerate(text_parts):
            if current_tokens >= max_tokens:
                break
                
            # Compress text part
            if text.strip():
                compressed_text = self._compress_text_smart(text, (max_chars - current_tokens * 4) // 2)
                parts.append(compressed_text)
                current_tokens += len(compressed_text) // 4
                metadata['text_compressed'] += 1
            
            # Add code block (if exists)
            if i < len(code_blocks):
                code = code_blocks[i]
                if current_tokens + len(code) // 4 <= max_tokens:
                    parts.append(code)
                    current_tokens += len(code) // 4
                    metadata['code_blocks_preserved'] += 1
                else:
                    # Truncate code if necessary
                    remaining_chars = max_chars - current_tokens * 4
                    parts.append(code[:remaining_chars] + '...\n```')
                    break
        
        return '\n'.join(parts), metadata
    
    def _compress_concept_question(self, content: str, max_tokens: int) -> Tuple[str, Dict]:
        """Compress concept explanations - keep key definitions and examples"""
        
        lines = content.split('\n')
        key_lines = []
        metadata = {'definitions_kept': 0, 'examples_kept': 0}
        
        max_chars = max_tokens * 4
        current_chars = 0
        
        # Priority patterns
        definition_patterns = ['is', 'are', 'means', 'defined as', 'refers to', ':']
        example_patterns = ['example', 'for instance', 'such as', 'e.g.', 'like']
        important_patterns = ['important', 'key', 'note', 'remember', 'crucial']
        
        # First pass: collect high-priority content
        for line in lines:
            if current_chars >= max_chars:
                break
                
            line_lower = line.lower().strip()
            
            # Skip empty lines
            if not line_lower:
                continue
            
            # Check priority
            is_definition = any(pattern in line_lower for pattern in definition_patterns)
            is_example = any(pattern in line_lower for pattern in example_patterns)
            is_important = any(pattern in line_lower for pattern in important_patterns)
            
            if is_definition or is_example or is_important or line_lower.startswith(('•', '-', '*', '1', '2', '3')):
                # Keep important lines
                if current_chars + len(line) <= max_chars:
                    key_lines.append(line)
                    current_chars += len(line)
                    
                    if is_definition:
                        metadata['definitions_kept'] += 1
                    elif is_example:
                        metadata['examples_kept'] += 1
                else:
                    # Compress line to fit
                    remaining = max_chars - current_chars
                    key_lines.append(line[:remaining] + '...')
                    break
        
        # If we have room, add some general content
        if current_chars < max_chars * 0.7 and len(key_lines) < 3:
            for line in lines:
                if line not in key_lines and line.strip():
                    compressed = self._compress_sentence(line, (max_chars - current_chars) // 2)
                    if compressed:
                        key_lines.append(compressed)
                        current_chars += len(compressed)
                        if current_chars >= max_chars * 0.9:
                            break
        
        return '\n'.join(key_lines), metadata
    
    def _compress_calculation(self, content: str, max_tokens: int) -> Tuple[str, Dict]:
        """Compress calculations - preserve formulas and results"""
        
        lines = content.split('\n')
        compressed_lines = []
        metadata = {'formulas_kept': 0, 'results_kept': 0}
        
        max_chars = max_tokens * 4
        current_chars = 0
        
        # Patterns for important content
        formula_pattern = r'[A-Za-z]\s*=|=\s*[A-Za-z]|\d+\s*[+\-*/]\s*\d+'
        result_pattern = r'=\s*\d+|result|answer|solution'
        
        for line in lines:
            if current_chars >= max_chars:
                break
            
            # Keep lines with formulas or results
            if re.search(formula_pattern, line):
                if current_chars + len(line) <= max_chars:
                    compressed_lines.append(line)
                    current_chars += len(line)
                    metadata['formulas_kept'] += 1
            elif re.search(result_pattern, line.lower()):
                if current_chars + len(line) <= max_chars:
                    compressed_lines.append(line)
                    current_chars += len(line)
                    metadata['results_kept'] += 1
            else:
                # Compress explanation text
                compressed = self._compress_sentence(line, 50)
                if compressed and current_chars + len(compressed) <= max_chars:
                    compressed_lines.append(compressed)
                    current_chars += len(compressed)
        
        return '\n'.join(compressed_lines), metadata
    
    def _compress_language(self, content: str, max_tokens: int) -> Tuple[str, Dict]:
        """Compress language practice - keep examples and key phrases"""
        
        max_chars = max_tokens * 4
        metadata = {'phrases_kept': 0, 'translations_kept': 0}
        
        # Extract key language elements
        lines = content.split('\n')
        compressed = []
        current_chars = 0
        
        for line in lines:
            if current_chars >= max_chars:
                break
            
            # Keep lines with quotes (likely examples)
            if '"' in line or "'" in line:
                if current_chars + len(line) <= max_chars:
                    compressed.append(line)
                    current_chars += len(line)
                    metadata['phrases_kept'] += 1
            # Keep lines with translations (->)
            elif '->' in line or '→' in line:
                if current_chars + len(line) <= max_chars:
                    compressed.append(line)
                    current_chars += len(line)
                    metadata['translations_kept'] += 1
            else:
                # Light compression for other content
                if len(line) > 100:
                    line = line[:80] + '...'
                if current_chars + len(line) <= max_chars:
                    compressed.append(line)
                    current_chars += len(line)
        
        return '\n'.join(compressed), metadata
    
    def _compress_case_study(self, content: str, max_tokens: int) -> Tuple[str, Dict]:
        """Compress case studies - keep problem, key points, and conclusion"""
        
        sections = self._extract_sections(content)
        max_chars = max_tokens * 4
        metadata = {'sections_kept': 0}
        
        compressed_parts = []
        current_chars = 0
        
        # Priority sections
        priority_sections = ['problem', 'challenge', 'solution', 'conclusion', 'key', 'result']
        
        # First, add priority sections
        for section_name, section_content in sections.items():
            if current_chars >= max_chars:
                break
                
            if any(p in section_name.lower() for p in priority_sections):
                compressed_section = self._compress_text_smart(
                    section_content, 
                    min(len(section_content), (max_chars - current_chars) // 2)
                )
                compressed_parts.append(f"**{section_name}**\n{compressed_section}")
                current_chars += len(compressed_section)
                metadata['sections_kept'] += 1
        
        # Add other sections if space allows
        for section_name, section_content in sections.items():
            if current_chars >= max_chars * 0.9:
                break
                
            if not any(p in section_name.lower() for p in priority_sections):
                remaining = max_chars - current_chars
                if remaining > 100:
                    compressed_section = self._compress_text_smart(section_content, remaining // 2)
                    compressed_parts.append(f"**{section_name}**\n{compressed_section}")
                    current_chars += len(compressed_section)
                    metadata['sections_kept'] += 1
        
        return '\n\n'.join(compressed_parts), metadata
    
    def _compress_historical(self, content: str, max_tokens: int) -> Tuple[str, Dict]:
        """Compress historical content - keep dates, events, and key facts"""
        
        lines = content.split('\n')
        max_chars = max_tokens * 4
        metadata = {'dates_kept': 0, 'events_kept': 0}
        
        compressed = []
        current_chars = 0
        
        # Date pattern
        date_pattern = r'\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b|\b\d{4}\b|century|decade|year'
        
        for line in lines:
            if current_chars >= max_chars:
                break
            
            # Prioritize lines with dates
            if re.search(date_pattern, line):
                if current_chars + len(line) <= max_chars:
                    compressed.append(line)
                    current_chars += len(line)
                    metadata['dates_kept'] += 1
            # Keep short, factual lines
            elif len(line) < 100 and ':' in line:
                if current_chars + len(line) <= max_chars:
                    compressed.append(line)
                    current_chars += len(line)
                    metadata['events_kept'] += 1
            else:
                # Compress longer explanations
                compressed_line = self._compress_sentence(line, 80)
                if compressed_line and current_chars + len(compressed_line) <= max_chars:
                    compressed.append(compressed_line)
                    current_chars += len(compressed_line)
        
        return '\n'.join(compressed), metadata
    
    def _compress_creative(self, content: str, max_tokens: int) -> Tuple[str, Dict]:
        """Compress creative content - preserve style and key elements"""
        
        # For creative content, try to preserve beginning and end
        max_chars = max_tokens * 4
        
        if len(content) <= max_chars:
            return content, {'compression': 'none'}
        
        # Keep first 40% and last 20% with middle summary
        first_part_size = int(max_chars * 0.4)
        last_part_size = int(max_chars * 0.2)
        
        first_part = content[:first_part_size]
        last_part = content[-last_part_size:]
        
        # Add continuation indicator
        middle_indicator = "\n\n[... nội dung tiếp tục ...]\n\n"
        
        compressed = first_part + middle_indicator + last_part
        
        return compressed, {
            'method': 'beginning_end_preservation',
            'first_part_chars': first_part_size,
            'last_part_chars': last_part_size
        }
    
    def _compress_troubleshooting(self, content: str, max_tokens: int) -> Tuple[str, Dict]:
        """Compress troubleshooting - keep error messages and solutions"""
        
        lines = content.split('\n')
        max_chars = max_tokens * 4
        metadata = {'errors_kept': 0, 'solutions_kept': 0}
        
        compressed = []
        current_chars = 0
        
        # Priority patterns
        error_patterns = ['error', 'exception', 'fail', 'issue', 'problem', 'bug']
        solution_patterns = ['fix', 'solution', 'resolve', 'solved', 'workaround', 'try']
        
        for line in lines:
            if current_chars >= max_chars:
                break
            
            line_lower = line.lower()
            
            # Keep error messages
            if any(pattern in line_lower for pattern in error_patterns):
                if current_chars + len(line) <= max_chars:
                    compressed.append(line)
                    current_chars += len(line)
                    metadata['errors_kept'] += 1
            # Keep solutions
            elif any(pattern in line_lower for pattern in solution_patterns):
                if current_chars + len(line) <= max_chars:
                    compressed.append(line)
                    current_chars += len(line)
                    metadata['solutions_kept'] += 1
            # Keep code snippets
            elif line.strip().startswith(('$', '>', '#')) or '```' in line:
                if current_chars + len(line) <= max_chars:
                    compressed.append(line)
                    current_chars += len(line)
        
        return '\n'.join(compressed), metadata
    
    def _compress_general(self, content: str, max_tokens: int) -> Tuple[str, Dict]:
        """General compression - balanced approach"""
        
        max_chars = max_tokens * 4
        
        if len(content) <= max_chars:
            return content, {'method': 'no_compression'}
        
        # Use smart text compression
        compressed = self._compress_text_smart(content, max_chars)
        
        return compressed, {'method': 'smart_summarization'}
    
    def _compress_text_smart(self, text: str, max_chars: int) -> str:
        """Smart text compression preserving meaning"""
        
        if len(text) <= max_chars:
            return text
        
        sentences = self._split_into_sentences(text)
        
        if not sentences:
            return text[:max_chars] + '...'
        
        # Score sentences by importance
        scored_sentences = []
        for i, sentence in enumerate(sentences):
            score = self._score_sentence_importance(sentence, i, len(sentences))
            scored_sentences.append((score, sentence))
        
        # Sort by importance
        scored_sentences.sort(reverse=True, key=lambda x: x[0])
        
        # Build compressed text
        selected = []
        current_chars = 0
        
        for score, sentence in scored_sentences:
            if current_chars + len(sentence) <= max_chars:
                selected.append(sentence)
                current_chars += len(sentence)
            elif current_chars < max_chars * 0.8:  # Allow partial sentence if we're under 80%
                remaining = max_chars - current_chars
                if remaining > 50:  # Only add if meaningful
                    selected.append(sentence[:remaining] + '...')
                break
        
        # Reorder selected sentences to maintain flow
        result = []
        for sentence in sentences:
            if sentence in selected:
                result.append(sentence)
        
        return ' '.join(result)
    
    def _score_sentence_importance(self, sentence: str, position: int, total: int) -> float:
        """Score sentence importance for compression"""
        
        score = 0.0
        
        # Position scoring (first and last sentences are often important)
        if position == 0:
            score += 0.3
        elif position == total - 1:
            score += 0.2
        elif position < 3:
            score += 0.1
        
        # Length scoring (prefer medium-length sentences)
        length = len(sentence)
        if 50 <= length <= 150:
            score += 0.2
        elif length < 30:
            score -= 0.1
        
        # Content scoring
        important_patterns = [
            'important', 'key', 'main', 'primary', 'significant',
            'however', 'but', 'therefore', 'because', 'result',
            'first', 'second', 'finally', 'conclusion',
            ':', '-', '•'  # Lists and definitions
        ]
        
        sentence_lower = sentence.lower()
        for pattern in important_patterns:
            if pattern in sentence_lower:
                score += 0.1
        
        # Question scoring
        if '?' in sentence:
            score += 0.15
        
        # Number/data scoring
        if re.search(r'\d+', sentence):
            score += 0.1
        
        return score
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        
        # Simple sentence splitter
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Clean up
        cleaned = []
        for sent in sentences:
            sent = sent.strip()
            if sent and len(sent) > 10:  # Filter out too short
                cleaned.append(sent)
        
        return cleaned
    
    def _compress_sentence(self, sentence: str, max_length: int) -> str:
        """Compress a single sentence"""
        
        if len(sentence) <= max_length:
            return sentence
        
        # Try to cut at word boundary
        if max_length > 20:
            cut_point = sentence.rfind(' ', 0, max_length - 3)
            if cut_point > max_length * 0.7:
                return sentence[:cut_point] + '...'
        
        return sentence[:max_length - 3] + '...'
    
    def _extract_sections(self, content: str) -> Dict[str, str]:
        """Extract sections from structured content"""
        
        sections = {}
        current_section = "Introduction"
        current_content = []
        
        lines = content.split('\n')
        
        for line in lines:
            # Check if line is a section header
            if line.strip() and (
                line.isupper() or 
                line.startswith('#') or 
                (line.endswith(':') and len(line) < 50)
            ):
                # Save previous section
                if current_content:
                    sections[current_section] = '\n'.join(current_content)
                
                # Start new section
                current_section = line.strip(' #:')
                current_content = []
            else:
                current_content.append(line)
        
        # Save last section
        if current_content:
            sections[current_section] = '\n'.join(current_content)
        
        return sections 