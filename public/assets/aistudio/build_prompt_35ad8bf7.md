Hãy dựng một web app chấm IELTS Writing Task 2, giao diện tiếng Việt.

Chức năng:
1. Hai ô nhập: "Đề bài" và "Bài viết". Có đếm số từ.
2. Nút "Chấm bài" gọi Gemini với system instruction và responseSchema đã cấu hình trong prompt này (kết quả là JSON theo schema).
3. Hiển thị kết quả:
   - Bốn thẻ điểm (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy) và một thẻ điểm tổng. Điểm từng tiêu chí là số nguyên.
   - Dòng "độ chắc chắn của điểm" (confidence_note), kèm dòng nhắc: điểm AI chỉ là ước lượng, có thể lệch một band so với giám khảo thật.
   - Danh sách phản biện ý tưởng (TR, CC), mỗi mục có nhãn mức band và nhãn "có trừ điểm" hay "chỉ ghi chú".
   - Ghi chú ngôn ngữ, nhãn "lỗi hệ thống" hoặc "minor".
   - Điểm mạnh, khoảng cách tới band kế tiếp, và tối đa 2 câu hỏi của coach.
4. Sau khi chấm, cho phép người dùng nhập "Điểm giáo viên" (bốn số nguyên, không bắt buộc) và hiển thị chênh lệch so với điểm AI. Lưu lịch sử vào localStorage của trình duyệt (bọc try/catch) để theo dõi độ lệch theo thời gian.
5. Có nút xuất lịch sử ra JSON, để sau này bổ sung vào bộ calibration.

Yêu cầu giao diện: sạch, dễ đọc trên điện thoại, hỗ trợ giao diện sáng và tối, không dùng emoji.

Lưu ý: không gắn nhãn "điểm chính thức". Hiển thị thông báo quyền riêng tư: bài viết được gửi tới Gemini để chấm.
