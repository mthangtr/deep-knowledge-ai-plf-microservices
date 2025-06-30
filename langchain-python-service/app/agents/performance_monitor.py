"""
Performance Monitoring Module
Real-time system metrics và optimization recommendations
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import time
import asyncio
from datetime import datetime, timedelta
from collections import deque, defaultdict
from loguru import logger
import psutil
import statistics
import json

from app.agents.context_quality_analyzer import ContextMetrics, QualityScore
from app.agents.router_agent import ContextNeedType

class AlertLevel(Enum):
    """Alert severity levels"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

@dataclass
class PerformanceMetrics:
    """System performance metrics"""
    timestamp: datetime
    
    # Request metrics
    requests_per_minute: float
    avg_response_time: float
    p95_response_time: float
    p99_response_time: float
    error_rate: float
    
    # Context metrics
    avg_context_tokens: float
    avg_context_quality: float
    context_efficiency: float
    
    # Resource usage
    cpu_usage: float
    memory_usage: float
    memory_used_mb: float
    
    # Model metrics
    model_usage_distribution: Dict[str, int]
    most_used_model: str
    
    # Router metrics
    router_accuracy: float
    context_type_distribution: Dict[str, int]

@dataclass 
class PerformanceAlert:
    """Performance alert notification"""
    level: AlertLevel
    type: str
    message: str
    metric_value: float
    threshold: float
    timestamp: datetime
    recommendations: List[str] = field(default_factory=list)

@dataclass
class OptimizationReport:
    """Optimization recommendations report"""
    timestamp: datetime
    overall_score: float  # 0.0-1.0
    
    # Issues found
    critical_issues: List[str]
    improvement_opportunities: List[str]
    
    # Specific recommendations
    token_optimization: Dict[str, Any]
    performance_optimization: Dict[str, Any]
    quality_optimization: Dict[str, Any]
    
    # Expected improvements
    estimated_cost_savings: float  # % reduction
    estimated_performance_gain: float  # % improvement
    estimated_quality_improvement: float  # % improvement

class PerformanceMonitor:
    """Real-time performance monitoring với alert system"""
    
    def __init__(self, alert_thresholds: Optional[Dict] = None):
        self.metrics_history: deque = deque(maxlen=1440)  # 24 hours of minute data
        self.response_times: deque = deque(maxlen=1000)   # Last 1000 requests
        self.context_metrics: deque = deque(maxlen=1000)  # Last 1000 context evaluations
        self.alerts: deque = deque(maxlen=100)            # Last 100 alerts
        
        # Request tracking
        self.request_count = 0
        self.error_count = 0
        self.last_minute_requests = deque(maxlen=60)  # Requests in last minute
        
        # Model usage tracking
        self.model_usage = defaultdict(int)
        self.context_type_usage = defaultdict(int)
        
        # Default alert thresholds
        self.alert_thresholds = alert_thresholds or {
            'response_time_p95': 5.0,      # 5 seconds
            'response_time_p99': 10.0,     # 10 seconds
            'error_rate': 0.05,            # 5%
            'cpu_usage': 80.0,             # 80%
            'memory_usage': 85.0,          # 85%
            'context_quality': 0.6,        # Below 60%
            'token_efficiency': 0.5,       # Below 50%
            'router_accuracy': 0.7         # Below 70%
        }
        
        # Performance baselines
        self.baselines = {
            'response_time': 2.0,
            'context_tokens': 500,
            'context_quality': 0.8,
            'cpu_usage': 50.0,
            'memory_usage': 60.0
        }
        
        # Start background monitoring
        self.monitoring_task = None
        logger.info("Performance Monitor initialized")
    
    async def start_monitoring(self):
        """Start background monitoring task"""
        if self.monitoring_task:
            return
        
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Background performance monitoring started")
    
    async def stop_monitoring(self):
        """Stop background monitoring task"""
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
            self.monitoring_task = None
            logger.info("Background performance monitoring stopped")
    
    async def _monitoring_loop(self):
        """Background monitoring loop - runs every minute"""
        while True:
            try:
                await asyncio.sleep(60)  # Monitor every minute
                await self._collect_metrics()
                await self._check_alerts()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
    
    async def record_request(
        self,
        response_time: float,
        model_used: str,
        context_metrics: Optional[ContextMetrics] = None,
        error: bool = False
    ):
        """Record a request for performance tracking"""
        
        timestamp = time.time()
        
        # Update request counters
        self.request_count += 1
        if error:
            self.error_count += 1
        
        # Track response time
        self.response_times.append(response_time)
        
        # Track model usage
        self.model_usage[model_used] += 1
        
        # Track request timestamps for RPM calculation
        self.last_minute_requests.append(timestamp)
        
        # Track context metrics if provided
        if context_metrics:
            self.context_metrics.append(context_metrics)
            self.context_type_usage[context_metrics.context_type.value] += 1
        
        # Real-time alerting for critical issues
        await self._check_real_time_alerts(response_time, context_metrics, error)
    
    async def _collect_metrics(self):
        """Collect comprehensive performance metrics"""
        
        try:
            now = datetime.now()
            
            # Calculate request metrics
            rpm = self._calculate_requests_per_minute()
            avg_response = statistics.mean(self.response_times) if self.response_times else 0.0
            p95_response = self._calculate_percentile(list(self.response_times), 95) if self.response_times else 0.0
            p99_response = self._calculate_percentile(list(self.response_times), 99) if self.response_times else 0.0
            error_rate = self.error_count / max(self.request_count, 1)
            
            # Calculate context metrics
            recent_context = list(self.context_metrics)[-100:]  # Last 100 context evaluations
            avg_tokens = statistics.mean([m.token_usage for m in recent_context]) if recent_context else 0.0
            avg_quality = statistics.mean([m.overall_quality for m in recent_context]) if recent_context else 0.0
            context_efficiency = statistics.mean([m.efficiency_score for m in recent_context]) if recent_context else 0.0
            
            # Get system resource usage
            cpu_usage = psutil.cpu_percent(interval=None)
            memory = psutil.virtual_memory()
            memory_usage = memory.percent
            memory_used_mb = memory.used / (1024 * 1024)
            
            # Model usage distribution
            total_requests = sum(self.model_usage.values())
            model_distribution = {
                model: count for model, count in self.model_usage.items()
            } if total_requests > 0 else {}
            
            most_used_model = max(self.model_usage.keys(), key=self.model_usage.get) if self.model_usage else "none"
            
            # Router accuracy (simplified)
            router_accuracy = self._calculate_router_accuracy(recent_context)
            
            # Context type distribution
            total_context = sum(self.context_type_usage.values())
            context_distribution = {
                ctx_type: count for ctx_type, count in self.context_type_usage.items()
            } if total_context > 0 else {}
            
            # Create metrics object
            metrics = PerformanceMetrics(
                timestamp=now,
                requests_per_minute=rpm,
                avg_response_time=avg_response,
                p95_response_time=p95_response,
                p99_response_time=p99_response,
                error_rate=error_rate,
                avg_context_tokens=avg_tokens,
                avg_context_quality=avg_quality,
                context_efficiency=context_efficiency,
                cpu_usage=cpu_usage,
                memory_usage=memory_usage,
                memory_used_mb=memory_used_mb,
                model_usage_distribution=model_distribution,
                most_used_model=most_used_model,
                router_accuracy=router_accuracy,
                context_type_distribution=context_distribution
            )
            
            # Store metrics
            self.metrics_history.append(metrics)
            
            logger.debug(f"Performance metrics collected - RPM: {rpm:.1f}, "
                        f"Avg Response: {avg_response:.2f}s, Quality: {avg_quality:.2f}")
            
        except Exception as e:
            logger.error(f"Error collecting performance metrics: {e}")
    
    async def _check_real_time_alerts(
        self,
        response_time: float,
        context_metrics: Optional[ContextMetrics],
        error: bool
    ):
        """Check for immediate alerts on critical metrics"""
        
        alerts = []
        
        # Critical response time
        if response_time > self.alert_thresholds['response_time_p99']:
            alerts.append(PerformanceAlert(
                level=AlertLevel.CRITICAL,
                type="response_time",
                message=f"Extremely slow response: {response_time:.2f}s",
                metric_value=response_time,
                threshold=self.alert_thresholds['response_time_p99'],
                timestamp=datetime.now(),
                recommendations=[
                    "Check model availability and latency",
                    "Verify context size and complexity",
                    "Monitor system resources"
                ]
            ))
        
        # Context quality issues
        if context_metrics and context_metrics.overall_quality < self.alert_thresholds['context_quality']:
            alerts.append(PerformanceAlert(
                level=AlertLevel.HIGH,
                type="context_quality",
                message=f"Low context quality: {context_metrics.overall_quality:.2f}",
                metric_value=context_metrics.overall_quality,
                threshold=self.alert_thresholds['context_quality'],
                timestamp=datetime.now(),
                recommendations=[
                    "Review context building strategy",
                    "Check router agent accuracy",
                    "Validate context relevance"
                ]
            ))
        
        # System resource alerts
        try:
            cpu_usage = psutil.cpu_percent(interval=None)
            memory_usage = psutil.virtual_memory().percent
            
            if cpu_usage > self.alert_thresholds['cpu_usage']:
                alerts.append(PerformanceAlert(
                    level=AlertLevel.HIGH,
                    type="cpu_usage",
                    message=f"High CPU usage: {cpu_usage:.1f}%",
                    metric_value=cpu_usage,
                    threshold=self.alert_thresholds['cpu_usage'],
                    timestamp=datetime.now(),
                    recommendations=[
                        "Consider scaling horizontally",
                        "Optimize context processing",
                        "Check for inefficient operations"
                    ]
                ))
            
            if memory_usage > self.alert_thresholds['memory_usage']:
                alerts.append(PerformanceAlert(
                    level=AlertLevel.HIGH,
                    type="memory_usage",
                    message=f"High memory usage: {memory_usage:.1f}%",
                    metric_value=memory_usage,
                    threshold=self.alert_thresholds['memory_usage'],
                    timestamp=datetime.now(),
                    recommendations=[
                        "Clear context history cache",
                        "Optimize memory usage patterns",
                        "Consider increasing memory limits"
                    ]
                ))
                
        except Exception as e:
            logger.debug(f"Could not check system resources: {e}")
        
        # Store alerts
        for alert in alerts:
            self.alerts.append(alert)
            logger.warning(f"ALERT [{alert.level.value}] {alert.type}: {alert.message}")
    
    async def _check_alerts(self):
        """Check for performance alerts based on historical data"""
        
        if not self.metrics_history:
            return
        
        latest_metrics = self.metrics_history[-1]
        alerts = []
        
        # Error rate alert
        if latest_metrics.error_rate > self.alert_thresholds['error_rate']:
            alerts.append(PerformanceAlert(
                level=AlertLevel.HIGH,
                type="error_rate",
                message=f"High error rate: {latest_metrics.error_rate:.1%}",
                metric_value=latest_metrics.error_rate,
                threshold=self.alert_thresholds['error_rate'],
                timestamp=datetime.now(),
                recommendations=[
                    "Investigate recent errors",
                    "Check model availability",
                    "Verify API configurations"
                ]
            ))
        
        # Response time trend alert
        if len(self.metrics_history) >= 5:
            recent_response_times = [m.avg_response_time for m in list(self.metrics_history)[-5:]]
            if all(rt > self.baselines['response_time'] * 1.5 for rt in recent_response_times):
                alerts.append(PerformanceAlert(
                    level=AlertLevel.MEDIUM,
                    type="response_time_trend",
                    message="Consistently slow response times detected",
                    metric_value=statistics.mean(recent_response_times),
                    threshold=self.baselines['response_time'],
                    timestamp=datetime.now(),
                    recommendations=[
                        "Review context optimization settings",
                        "Consider model switching",
                        "Analyze request patterns"
                    ]
                ))
        
        # Store new alerts
        for alert in alerts:
            self.alerts.append(alert)
            logger.info(f"ALERT [{alert.level.value}] {alert.type}: {alert.message}")
    
    def _calculate_requests_per_minute(self) -> float:
        """Calculate requests per minute"""
        current_time = time.time()
        minute_ago = current_time - 60
        
        # Count requests in last minute
        recent_requests = [t for t in self.last_minute_requests if t > minute_ago]
        return len(recent_requests)
    
    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile of values"""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = int((percentile / 100.0) * len(sorted_values))
        index = min(index, len(sorted_values) - 1)
        return sorted_values[index]
    
    def _calculate_router_accuracy(self, context_metrics: List[ContextMetrics]) -> float:
        """Calculate router accuracy based on context quality"""
        if not context_metrics:
            return 0.0
        
        # Simple heuristic: higher quality indicates better router decisions
        quality_scores = [m.overall_quality for m in context_metrics]
        avg_quality = statistics.mean(quality_scores)
        
        # Convert quality to accuracy estimate
        return min(avg_quality * 1.2, 1.0)  # Boost slightly and cap at 1.0
    
    def get_current_metrics(self) -> Optional[PerformanceMetrics]:
        """Get latest performance metrics"""
        return self.metrics_history[-1] if self.metrics_history else None
    
    def get_recent_alerts(self, hours_back: int = 1) -> List[PerformanceAlert]:
        """Get recent alerts"""
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        return [alert for alert in self.alerts if alert.timestamp >= cutoff_time]
    
    def get_performance_summary(self, hours_back: int = 24) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        recent_metrics = [m for m in self.metrics_history if m.timestamp >= cutoff_time]
        
        if not recent_metrics:
            return {"error": "No metrics available for the specified period"}
        
        # Calculate averages and trends
        avg_response_time = statistics.mean([m.avg_response_time for m in recent_metrics])
        avg_quality = statistics.mean([m.avg_context_quality for m in recent_metrics])
        avg_tokens = statistics.mean([m.avg_context_tokens for m in recent_metrics])
        avg_efficiency = statistics.mean([m.context_efficiency for m in recent_metrics])
        
        # Calculate trends
        response_times = [m.avg_response_time for m in recent_metrics]
        quality_scores = [m.avg_context_quality for m in recent_metrics]
        
        return {
            "period_hours": hours_back,
            "total_metrics": len(recent_metrics),
            "performance": {
                "avg_response_time": avg_response_time,
                "response_time_trend": self._calculate_trend(response_times),
                "avg_quality": avg_quality,
                "quality_trend": self._calculate_trend(quality_scores),
                "avg_tokens": avg_tokens,
                "avg_efficiency": avg_efficiency
            },
            "alerts": {
                "total_alerts": len(self.get_recent_alerts(hours_back)),
                "critical_alerts": len([a for a in self.get_recent_alerts(hours_back) if a.level == AlertLevel.CRITICAL]),
                "recent_alerts": [
                    {
                        "level": a.level.value,
                        "type": a.type,
                        "message": a.message,
                        "timestamp": a.timestamp.isoformat()
                    }
                    for a in self.get_recent_alerts(1)  # Last hour
                ]
            },
            "recommendations": self._generate_performance_recommendations(recent_metrics)
        }
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction"""
        if len(values) < 2:
            return "stable"
        
        mid = len(values) // 2
        first_half = statistics.mean(values[:mid])
        second_half = statistics.mean(values[mid:])
        
        change_percent = ((second_half - first_half) / first_half * 100) if first_half > 0 else 0
        
        if change_percent > 10:
            return "improving"
        elif change_percent < -10:
            return "declining"
        else:
            return "stable"
    
    def _generate_performance_recommendations(
        self,
        recent_metrics: List[PerformanceMetrics]
    ) -> List[str]:
        """Generate performance optimization recommendations"""
        
        recommendations = []
        
        if not recent_metrics:
            return recommendations
        
        latest = recent_metrics[-1]
        
        # Response time recommendations
        if latest.avg_response_time > self.baselines['response_time']:
            recommendations.append(
                f"Consider optimizing context size - current avg: {latest.avg_context_tokens:.0f} tokens"
            )
        
        # Quality recommendations
        if latest.avg_context_quality < self.baselines['context_quality']:
            recommendations.append(
                "Review context relevance and router agent accuracy"
            )
        
        # Resource recommendations
        if latest.cpu_usage > 70:
            recommendations.append(
                f"High CPU usage ({latest.cpu_usage:.1f}%) - consider horizontal scaling"
            )
        
        if latest.memory_usage > 75:
            recommendations.append(
                f"High memory usage ({latest.memory_usage:.1f}%) - optimize caching strategies"
            )
        
        # Efficiency recommendations
        if latest.context_efficiency < 0.7:
            recommendations.append(
                "Low context efficiency - review token budget allocation"
            )
        
        return recommendations
    
    async def generate_optimization_report(self) -> OptimizationReport:
        """Generate comprehensive optimization report"""
        
        current_time = datetime.now()
        recent_metrics = list(self.metrics_history)[-60:]  # Last hour of data
        recent_context = list(self.context_metrics)[-100:]  # Last 100 context evaluations
        
        # Calculate overall system score
        overall_score = self._calculate_overall_score(recent_metrics, recent_context)
        
        # Identify critical issues
        critical_issues = []
        improvement_opportunities = []
        
        if recent_metrics:
            latest = recent_metrics[-1]
            
            if latest.error_rate > 0.03:  # 3%
                critical_issues.append(f"High error rate: {latest.error_rate:.1%}")
            
            if latest.avg_response_time > 3.0:
                critical_issues.append(f"Slow response times: {latest.avg_response_time:.2f}s avg")
            
            if latest.avg_context_quality < 0.7:
                critical_issues.append(f"Low context quality: {latest.avg_context_quality:.2f}")
            
            # Improvement opportunities
            if latest.context_efficiency < 0.8:
                improvement_opportunities.append("Optimize token usage for better efficiency")
            
            if latest.avg_context_tokens > 1000:
                improvement_opportunities.append("Reduce average context size")
                
            if latest.cpu_usage > 60:
                improvement_opportunities.append("Optimize processing for better resource usage")
        
        # Generate specific optimization recommendations
        token_optimization = self._analyze_token_optimization(recent_context)
        performance_optimization = self._analyze_performance_optimization(recent_metrics)
        quality_optimization = self._analyze_quality_optimization(recent_context)
        
        # Estimate improvements
        estimated_cost_savings = self._estimate_cost_savings(token_optimization)
        estimated_performance_gain = self._estimate_performance_gain(performance_optimization)
        estimated_quality_improvement = self._estimate_quality_improvement(quality_optimization)
        
        return OptimizationReport(
            timestamp=current_time,
            overall_score=overall_score,
            critical_issues=critical_issues,
            improvement_opportunities=improvement_opportunities,
            token_optimization=token_optimization,
            performance_optimization=performance_optimization,
            quality_optimization=quality_optimization,
            estimated_cost_savings=estimated_cost_savings,
            estimated_performance_gain=estimated_performance_gain,
            estimated_quality_improvement=estimated_quality_improvement
        )
    
    def _calculate_overall_score(
        self,
        recent_metrics: List[PerformanceMetrics],
        recent_context: List[ContextMetrics]
    ) -> float:
        """Calculate overall system performance score"""
        
        if not recent_metrics:
            return 0.5
        
        latest = recent_metrics[-1]
        
        # Performance components (0.0-1.0)
        response_score = max(0, 1 - (latest.avg_response_time - 1.0) / 4.0)  # 1s baseline, 5s worst
        error_score = max(0, 1 - latest.error_rate / 0.1)  # 10% worst case
        resource_score = max(0, 1 - (latest.cpu_usage + latest.memory_usage) / 200)  # Combined resource usage
        
        # Context quality component
        quality_score = latest.avg_context_quality if recent_context else 0.5
        efficiency_score = latest.context_efficiency if recent_context else 0.5
        
        # Weighted average
        overall = (
            response_score * 0.25 +
            error_score * 0.20 +
            resource_score * 0.20 +
            quality_score * 0.20 +
            efficiency_score * 0.15
        )
        
        return max(0.0, min(1.0, overall))
    
    def _analyze_token_optimization(self, recent_context: List[ContextMetrics]) -> Dict[str, Any]:
        """Analyze token usage optimization opportunities"""
        
        if not recent_context:
            return {"message": "No context data available"}
        
        avg_tokens = statistics.mean([m.token_usage for m in recent_context])
        efficiency_scores = [m.efficiency_score for m in recent_context]
        avg_efficiency = statistics.mean(efficiency_scores)
        
        # Context type analysis
        context_types = [m.context_type.value for m in recent_context]
        type_distribution = {ct: context_types.count(ct) for ct in set(context_types)}
        
        recommendations = []
        
        if avg_tokens > 800:
            recommendations.append("Reduce average context size with more aggressive compression")
        
        if avg_efficiency < 0.7:
            recommendations.append("Improve token allocation strategy")
        
        if type_distribution.get("FULL_CONTEXT", 0) > len(recent_context) * 0.3:
            recommendations.append("Reduce usage of FULL_CONTEXT - use SMART_RETRIEVAL instead")
        
        return {
            "avg_tokens": avg_tokens,
            "avg_efficiency": avg_efficiency,
            "context_type_distribution": type_distribution,
            "recommendations": recommendations,
            "potential_savings": max(0, (avg_tokens - 500) / avg_tokens) if avg_tokens > 500 else 0
        }
    
    def _analyze_performance_optimization(self, recent_metrics: List[PerformanceMetrics]) -> Dict[str, Any]:
        """Analyze performance optimization opportunities"""
        
        if not recent_metrics:
            return {"message": "No performance data available"}
        
        response_times = [m.avg_response_time for m in recent_metrics]
        avg_response = statistics.mean(response_times)
        
        recommendations = []
        
        if avg_response > 2.0:
            recommendations.append("Optimize context building process")
        
        if any(m.cpu_usage > 80 for m in recent_metrics):
            recommendations.append("Consider horizontal scaling or code optimization")
        
        if any(m.memory_usage > 85 for m in recent_metrics):
            recommendations.append("Optimize memory usage and caching strategies")
        
        return {
            "avg_response_time": avg_response,
            "response_time_trend": self._calculate_trend(response_times),
            "recommendations": recommendations
        }
    
    def _analyze_quality_optimization(self, recent_context: List[ContextMetrics]) -> Dict[str, Any]:
        """Analyze context quality optimization opportunities"""
        
        if not recent_context:
            return {"message": "No context quality data available"}
        
        quality_scores = [m.overall_quality for m in recent_context]
        avg_quality = statistics.mean(quality_scores)
        
        # Component analysis
        avg_relevance = statistics.mean([m.relevance_score for m in recent_context])
        avg_completeness = statistics.mean([m.completeness_score for m in recent_context])
        avg_coherence = statistics.mean([m.coherence_score for m in recent_context])
        
        recommendations = []
        
        if avg_relevance < 0.7:
            recommendations.append("Improve keyword matching and relevance scoring")
        
        if avg_completeness < 0.7:
            recommendations.append("Review context completeness strategies")
        
        if avg_coherence < 0.7:
            recommendations.append("Optimize context flow and coherence")
        
        return {
            "avg_quality": avg_quality,
            "component_scores": {
                "relevance": avg_relevance,
                "completeness": avg_completeness,
                "coherence": avg_coherence
            },
            "recommendations": recommendations
        }
    
    def _estimate_cost_savings(self, token_optimization: Dict[str, Any]) -> float:
        """Estimate potential cost savings from token optimization"""
        potential_savings = token_optimization.get("potential_savings", 0)
        return min(potential_savings * 100, 40)  # Cap at 40% savings
    
    def _estimate_performance_gain(self, performance_optimization: Dict[str, Any]) -> float:
        """Estimate potential performance improvements"""
        avg_response = performance_optimization.get("avg_response_time", 2.0)
        if avg_response > 3.0:
            return 30  # 30% improvement possible
        elif avg_response > 2.0:
            return 15  # 15% improvement possible
        else:
            return 5   # 5% improvement possible
    
    def _estimate_quality_improvement(self, quality_optimization: Dict[str, Any]) -> float:
        """Estimate potential quality improvements"""
        avg_quality = quality_optimization.get("avg_quality", 0.8)
        if avg_quality < 0.6:
            return 25  # 25% improvement possible
        elif avg_quality < 0.8:
            return 15  # 15% improvement possible
        else:
            return 5   # 5% improvement possible 