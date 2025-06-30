"""
Context Quality Analyzer
Measures and optimizes context effectiveness với real-time metrics
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import time
import asyncio
from datetime import datetime, timedelta
from loguru import logger
import statistics
import re

from app.agents.context_manager import ContextPackage, Message
from app.agents.router_agent import ContextNeedType

class QualityScore(Enum):
    """Quality score levels"""
    EXCELLENT = "EXCELLENT"  # 0.9-1.0
    GOOD = "GOOD"           # 0.7-0.89
    AVERAGE = "AVERAGE"     # 0.5-0.69
    POOR = "POOR"          # 0.3-0.49
    VERY_POOR = "VERY_POOR" # 0.0-0.29

@dataclass
class ContextMetrics:
    """Metrics for context quality analysis"""
    relevance_score: float          # 0.0-1.0 how relevant context is
    completeness_score: float       # 0.0-1.0 how complete context is
    efficiency_score: float         # 0.0-1.0 token efficiency
    coherence_score: float         # 0.0-1.0 how coherent context flow is
    freshness_score: float         # 0.0-1.0 how recent/fresh context is
    
    overall_quality: float         # Weighted average
    quality_level: QualityScore    # Categorical quality
    
    # Performance metrics
    processing_time: float         # Time to build context
    token_usage: int              # Total tokens used
    compression_ratio: float      # How much was compressed
    
    # Contextual info
    context_type: ContextNeedType
    message_count: int
    session_length: int
    
    timestamp: datetime

@dataclass 
class OptimizationSuggestion:
    """Suggestions to improve context quality"""
    type: str                      # "reduce_tokens", "add_context", "improve_relevance"
    priority: str                  # "high", "medium", "low"
    description: str               # Human-readable description
    expected_improvement: float    # Expected quality improvement (0.0-1.0)
    implementation_cost: str       # "low", "medium", "high"

class ContextQualityAnalyzer:
    """Analyze và optimize context quality với real-time feedback"""
    
    def __init__(self):
        self.metrics_history: List[ContextMetrics] = []
        self.quality_thresholds = {
            QualityScore.EXCELLENT: 0.9,
            QualityScore.GOOD: 0.7,
            QualityScore.AVERAGE: 0.5,
            QualityScore.POOR: 0.3,
            QualityScore.VERY_POOR: 0.0
        }
        # Weights for overall quality calculation
        self.quality_weights = {
            'relevance': 0.3,      # Most important
            'completeness': 0.25,  # Very important
            'efficiency': 0.2,     # Important for cost
            'coherence': 0.15,     # Important for UX
            'freshness': 0.1       # Less critical
        }
        logger.info("Context Quality Analyzer initialized")
    
    async def analyze_context_quality(
        self,
        context_package: ContextPackage,
        user_message: str,
        processing_time: float,
        session_id: str
    ) -> ContextMetrics:
        """Comprehensive context quality analysis"""
        
        start_time = time.time()
        
        try:
            # Calculate individual scores
            relevance_score = await self._calculate_relevance_score(
                context_package, user_message
            )
            
            completeness_score = self._calculate_completeness_score(
                context_package, user_message
            )
            
            efficiency_score = self._calculate_efficiency_score(
                context_package
            )
            
            coherence_score = self._calculate_coherence_score(
                context_package
            )
            
            freshness_score = self._calculate_freshness_score(
                context_package
            )
            
            # Calculate overall quality với weights
            overall_quality = (
                relevance_score * self.quality_weights['relevance'] +
                completeness_score * self.quality_weights['completeness'] +
                efficiency_score * self.quality_weights['efficiency'] +
                coherence_score * self.quality_weights['coherence'] +
                freshness_score * self.quality_weights['freshness']
            )
            
            # Determine quality level
            quality_level = self._get_quality_level(overall_quality)
            
            # Create metrics object
            metrics = ContextMetrics(
                relevance_score=relevance_score,
                completeness_score=completeness_score,
                efficiency_score=efficiency_score,
                coherence_score=coherence_score,
                freshness_score=freshness_score,
                overall_quality=overall_quality,
                quality_level=quality_level,
                processing_time=processing_time,
                token_usage=context_package.total_tokens_estimate,
                compression_ratio=self._calculate_compression_ratio(context_package),
                context_type=context_package.context_type,
                message_count=len(context_package.recent) + len(context_package.relevant) + len(context_package.historical),
                session_length=len(context_package.recent) + len(context_package.historical),
                timestamp=datetime.now()
            )
            
            # Store for trend analysis
            self.metrics_history.append(metrics)
            
            # Keep only last 1000 metrics để avoid memory bloat
            if len(self.metrics_history) > 1000:
                self.metrics_history = self.metrics_history[-1000:]
            
            analysis_time = time.time() - start_time
            logger.debug(f"Context quality analysis completed in {analysis_time:.3f}s - "
                        f"Quality: {quality_level.value} ({overall_quality:.2f})")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error in context quality analysis: {e}")
            # Return default metrics
            return self._create_default_metrics(context_package, processing_time)
    
    async def _calculate_relevance_score(
        self, 
        context_package: ContextPackage, 
        user_message: str
    ) -> float:
        """Calculate how relevant context is to user message"""
        
        score = 0.0
        total_weight = 0.0
        
        # Extract keywords from user message
        user_keywords = self._extract_keywords(user_message)
        
        if not user_keywords:
            return 0.5  # Neutral score if no keywords
        
        # Analyze recent messages (highest weight)
        if context_package.recent:
            recent_relevance = self._calculate_message_relevance(
                context_package.recent, user_keywords
            )
            score += recent_relevance * 0.4
            total_weight += 0.4
        
        # Analyze relevant messages (high weight)
        if context_package.relevant:
            relevant_relevance = self._calculate_message_relevance(
                context_package.relevant, user_keywords
            )
            score += relevant_relevance * 0.35
            total_weight += 0.35
        
        # Analyze summary (medium weight)
        if context_package.summary:
            summary_relevance = self._calculate_text_relevance(
                context_package.summary, user_keywords
            )
            score += summary_relevance * 0.15
            total_weight += 0.15
        
        # Analyze historical (low weight)
        if context_package.historical:
            historical_relevance = self._calculate_message_relevance(
                context_package.historical[-5:], user_keywords  # Only recent historical
            )
            score += historical_relevance * 0.1
            total_weight += 0.1
        
        return score / total_weight if total_weight > 0 else 0.5
    
    def _calculate_completeness_score(
        self, 
        context_package: ContextPackage, 
        user_message: str
    ) -> float:
        """Calculate how complete the context is"""
        
        score = 0.0
        
        # Check context type appropriateness
        if context_package.context_type == ContextNeedType.NONE:
            score = 1.0 if not self._needs_context(user_message) else 0.3
        
        elif context_package.context_type == ContextNeedType.RECENT_ONLY:
            # Check if we have enough recent context
            if len(context_package.recent) >= 3:
                score = 0.8
            elif len(context_package.recent) >= 1:
                score = 0.6
            else:
                score = 0.2
        
        elif context_package.context_type == ContextNeedType.SMART_RETRIEVAL:
            # Check if we have both recent and relevant
            recent_score = 0.4 if context_package.recent else 0.0
            relevant_score = 0.6 if context_package.relevant else 0.0
            score = recent_score + relevant_score
        
        elif context_package.context_type == ContextNeedType.FULL_CONTEXT:
            # Check if we have comprehensive context
            components = 0
            if context_package.recent: components += 0.3
            if context_package.summary: components += 0.3
            if context_package.relevant: components += 0.2
            if context_package.historical: components += 0.2
            score = components
        
        return min(score, 1.0)
    
    def _calculate_efficiency_score(self, context_package: ContextPackage) -> float:
        """Calculate token efficiency score"""
        
        total_tokens = context_package.total_tokens_estimate
        
        # Ideal token ranges for different context types
        ideal_ranges = {
            ContextNeedType.NONE: (0, 50),
            ContextNeedType.RECENT_ONLY: (100, 400),
            ContextNeedType.SMART_RETRIEVAL: (300, 800),
            ContextNeedType.FULL_CONTEXT: (800, 1500)
        }
        
        ideal_min, ideal_max = ideal_ranges.get(
            context_package.context_type, 
            (0, 1500)
        )
        
        if total_tokens <= ideal_max and total_tokens >= ideal_min:
            # Perfect range
            return 1.0
        elif total_tokens < ideal_min:
            # Too little context
            return 0.7 + 0.3 * (total_tokens / ideal_min)
        else:
            # Too much context - penalize heavily
            overflow = total_tokens - ideal_max
            penalty = min(overflow / ideal_max, 0.7)  # Max 70% penalty
            return 1.0 - penalty
    
    def _calculate_coherence_score(self, context_package: ContextPackage) -> float:
        """Calculate how coherent the context flow is"""
        
        if not context_package.recent:
            return 1.0  # No context = perfectly coherent
        
        score = 0.0
        
        # Check temporal coherence (messages in chronological order)
        temporal_score = self._check_temporal_coherence(context_package.recent)
        score += temporal_score * 0.4
        
        # Check topical coherence (messages relate to each other)
        topical_score = self._check_topical_coherence(context_package.recent)
        score += topical_score * 0.4
        
        # Check role coherence (proper alternation user/assistant)
        role_score = self._check_role_coherence(context_package.recent)
        score += role_score * 0.2
        
        return score
    
    def _calculate_freshness_score(self, context_package: ContextPackage) -> float:
        """Calculate how fresh/recent the context is"""
        
        if not context_package.recent:
            return 1.0  # No context = perfectly fresh
        
        now = datetime.now()
        total_weight = 0.0
        freshness_sum = 0.0
        
        # Analyze recent messages
        for msg in context_package.recent:
            if hasattr(msg, 'timestamp') and msg.timestamp:
                age_hours = (now - msg.timestamp).total_seconds() / 3600
                
                # Freshness decay function
                if age_hours <= 1:
                    freshness = 1.0
                elif age_hours <= 24:
                    freshness = 0.8
                elif age_hours <= 168:  # 1 week
                    freshness = 0.6
                else:
                    freshness = 0.3
                
                freshness_sum += freshness
                total_weight += 1.0
        
        if total_weight == 0:
            return 0.8  # Default for messages without timestamps
        
        return freshness_sum / total_weight
    
    def _get_quality_level(self, overall_quality: float) -> QualityScore:
        """Convert numerical score to quality level"""
        
        for level, threshold in self.quality_thresholds.items():
            if overall_quality >= threshold:
                return level
        
        return QualityScore.VERY_POOR
    
    def _calculate_compression_ratio(self, context_package: ContextPackage) -> float:
        """Calculate how much context was compressed"""
        
        # Estimate original size vs current size
        # This is a rough estimation - in practice you'd track actual compression
        
        message_count = (
            len(context_package.recent) + 
            len(context_package.relevant) + 
            len(context_package.historical)
        )
        
        if message_count == 0:
            return 0.0
        
        # Rough estimation: assume average 200 chars per original message
        estimated_original = message_count * 200
        current_size = sum(
            len(msg.content) for msg in 
            context_package.recent + context_package.relevant + context_package.historical
        )
        
        if estimated_original == 0:
            return 0.0
        
        return current_size / estimated_original
    
    def _needs_context(self, message: str) -> bool:
        """Simple check if message likely needs context"""
        
        # Standalone patterns
        standalone_patterns = [
            "xin chào", "hello", "hi", "what is", "define", "explain",
            "how to", "tutorial", "guide"
        ]
        
        message_lower = message.lower()
        return not any(pattern in message_lower for pattern in standalone_patterns)
    
    def _calculate_message_relevance(
        self, 
        messages: List[Message], 
        keywords: List[str]
    ) -> float:
        """Calculate relevance score for a list of messages"""
        
        if not messages or not keywords:
            return 0.0
        
        total_relevance = 0.0
        
        for msg in messages:
            relevance = self._calculate_text_relevance(msg.content, keywords)
            total_relevance += relevance
        
        return total_relevance / len(messages)
    
    def _calculate_text_relevance(self, text: str, keywords: List[str]) -> float:
        """Calculate relevance score for text against keywords"""
        
        if not text or not keywords:
            return 0.0
        
        text_lower = text.lower()
        matches = 0
        
        for keyword in keywords:
            if keyword.lower() in text_lower:
                matches += 1
        
        return matches / len(keywords)
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        
        # Simple keyword extraction
        words = re.findall(r'\b\w{4,}\b', text.lower())
        
        # Remove common words
        stop_words = {
            "that", "this", "with", "from", "they", "been", "have", "their",
            "said", "each", "which", "does", "most", "some", "time", "very"
        }
        
        keywords = [w for w in words if w not in stop_words]
        return keywords[:10]  # Top 10 keywords
    
    def _check_temporal_coherence(self, messages: List[Message]) -> float:
        """Check if messages are in proper temporal order"""
        
        if len(messages) <= 1:
            return 1.0
        
        ordered_count = 0
        total_pairs = len(messages) - 1
        
        for i in range(len(messages) - 1):
            if hasattr(messages[i], 'timestamp') and hasattr(messages[i+1], 'timestamp'):
                if messages[i].timestamp <= messages[i+1].timestamp:
                    ordered_count += 1
            else:
                ordered_count += 1  # Assume correct if no timestamp
        
        return ordered_count / total_pairs if total_pairs > 0 else 1.0
    
    def _check_topical_coherence(self, messages: List[Message]) -> float:
        """Check if messages are topically related"""
        
        if len(messages) <= 1:
            return 1.0
        
        # Extract keywords from all messages
        all_keywords = []
        for msg in messages:
            keywords = self._extract_keywords(msg.content)
            all_keywords.extend(keywords)
        
        if not all_keywords:
            return 0.5  # Neutral score
        
        # Calculate overlap between adjacent messages
        coherence_scores = []
        
        for i in range(len(messages) - 1):
            keywords1 = set(self._extract_keywords(messages[i].content))
            keywords2 = set(self._extract_keywords(messages[i+1].content))
            
            if keywords1 or keywords2:
                overlap = len(keywords1 & keywords2)
                total = len(keywords1 | keywords2)
                coherence = overlap / total if total > 0 else 0.0
                coherence_scores.append(coherence)
        
        return statistics.mean(coherence_scores) if coherence_scores else 0.5
    
    def _check_role_coherence(self, messages: List[Message]) -> float:
        """Check proper role alternation"""
        
        if len(messages) <= 1:
            return 1.0
        
        alternations = 0
        total_transitions = len(messages) - 1
        
        for i in range(len(messages) - 1):
            if messages[i].role != messages[i+1].role:
                alternations += 1
        
        # Perfect alternation gets 1.0, no alternation gets 0.0
        return alternations / total_transitions if total_transitions > 0 else 1.0
    
    def _create_default_metrics(
        self, 
        context_package: ContextPackage, 
        processing_time: float
    ) -> ContextMetrics:
        """Create default metrics when analysis fails"""
        
        return ContextMetrics(
            relevance_score=0.5,
            completeness_score=0.5,
            efficiency_score=0.5,
            coherence_score=0.5,
            freshness_score=0.5,
            overall_quality=0.5,
            quality_level=QualityScore.AVERAGE,
            processing_time=processing_time,
            token_usage=context_package.total_tokens_estimate,
            compression_ratio=0.5,
            context_type=context_package.context_type,
            message_count=0,
            session_length=0,
            timestamp=datetime.now()
        )
    
    def get_quality_trends(self, hours_back: int = 24) -> Dict[str, Any]:
        """Get quality trends over specified time period"""
        
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        recent_metrics = [
            m for m in self.metrics_history 
            if m.timestamp >= cutoff_time
        ]
        
        if not recent_metrics:
            return {"error": "No metrics available for the specified period"}
        
        # Calculate trends
        quality_scores = [m.overall_quality for m in recent_metrics]
        token_usage = [m.token_usage for m in recent_metrics]
        processing_times = [m.processing_time for m in recent_metrics]
        
        return {
            "period_hours": hours_back,
            "total_requests": len(recent_metrics),
            "average_quality": statistics.mean(quality_scores),
            "quality_trend": self._calculate_trend(quality_scores),
            "average_tokens": statistics.mean(token_usage),
            "token_trend": self._calculate_trend(token_usage),
            "average_processing_time": statistics.mean(processing_times),
            "performance_trend": self._calculate_trend(processing_times)
        }
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction for a list of values"""
        
        if len(values) < 2:
            return "stable"
        
        # Compare first half with second half
        mid = len(values) // 2
        first_half = statistics.mean(values[:mid])
        second_half = statistics.mean(values[mid:])
        
        change_percent = ((second_half - first_half) / first_half * 100) if first_half > 0 else 0
        
        if change_percent > 5:
            return "improving"
        elif change_percent < -5:
            return "declining"
        else:
            return "stable" 