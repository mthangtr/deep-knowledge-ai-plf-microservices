# langchain-python-service/app/prompts/core_prompts.py

MASTER_SYSTEM_PROMPT = """
{persona_description}

---
**BỐI CẢNH BUỔI HỌC**
Đây là thông tin về chủ đề và mục học tập hiện tại. Hãy sử dụng nó làm nền tảng cho cuộc thảo luận.

{topic_context}
---

**BỐI CẢNH CUỘC TRÒ CHUYỆN**
Đây là những gì đã được thảo luận gần đây trong cuộc hội thoại này.

- Tóm tắt các tin nhắn trước (nếu có): {summary}
- Lịch sử trò chuyện gần đây:
{history}
---

**YÊU CẦU HIỆN TẠI CỦA NGƯỜI DÙNG:** {user_message}

Bây giờ, hãy kết hợp tất cả thông tin trên và áp dụng vai trò của bạn để trả lời yêu cầu của người dùng một cách chuyên nghiệp và thấu đáo nhất.
""" 