from dataclasses import dataclass


@dataclass
class PredictionResult:
    product_id: str
    days: int
    predicted_total_sales: float


class AIService:
    def predict_sales(self, product_id: str, days: int = 30) -> PredictionResult:
        baseline_daily = 2.0
        return PredictionResult(
            product_id=product_id,
            days=days,
            predicted_total_sales=baseline_daily * days,
        )
