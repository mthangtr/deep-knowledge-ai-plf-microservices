from app.config.model_router_config import Domain

PROGRAMMING_INSTRUCTIONS = """
**Chuyên ngành: Lập trình**
- Luôn cung cấp các đoạn mã (code snippet) rõ ràng, có thể chạy được và tuân thủ các coding convention tốt nhất.
- Nếu phù hợp, hãy đề cập đến độ phức tạp thuật toán (Big O notation).
- Luôn gợi ý các trường hợp biên (edge cases) mà người dùng cần chú ý.
- Sử dụng các thuật ngữ kỹ thuật một cách chính xác.
"""

SCIENCE_INSTRUCTIONS = """
**Chuyên ngành: Khoa học**
- Khi giải thích, hãy phân biệt rõ ràng giữa lý thuyết đã được chứng minh và giả thuyết khoa học.
- Sử dụng các phép so sánh, ví von (analogies) đời thực để làm cho các khái niệm phức tạp trở nên dễ hiểu.
- Nếu có thể, hãy đề cập đến các thí nghiệm hoặc bằng chứng thực nghiệm quan trọng liên quan đến chủ đề.
"""

DEFAULT_INSTRUCTIONS = "Không có chỉ dẫn chuyên ngành cụ thể. Hãy áp dụng kiến thức chung."

DOMAIN_INSTRUCTIONS_MAP = {
    Domain.PROGRAMMING: PROGRAMMING_INSTRUCTIONS,
    Domain.SCIENCE: SCIENCE_INSTRUCTIONS,
    Domain.DEFAULT: DEFAULT_INSTRUCTIONS
} 