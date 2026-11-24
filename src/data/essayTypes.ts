import type { EssayTypeId } from '../types/ielts';

export interface StanceOption {
  id: string;
  label: string;
  description: string;
  riskWarning: string;
}

export interface EssayTypeConfig {
  id: EssayTypeId;
  name: string;
  shortName: string;
  signals: string;
  checklist: string[];
  stances: StanceOption[];
}

export const ESSAY_TYPES: EssayTypeConfig[] = [
  {
    id: 'opinion',
    name: 'Opinion / Agree-Disagree',
    shortName: 'Opinion',
    signals: 'Do you agree or disagree? / To what extent do you agree or disagree? / Positive or negative?',
    checklist: [
      'Nêu lập trường (position) rõ ràng ngay ở Introduction và giữ nhất quán tới Conclusion.',
      'Trả lời trực tiếp câu hỏi mức độ (extent), không bỏ lửng hoặc mâu thuẫn giữa hai thân bài.',
      'Mỗi luận điểm chính có ít nhất một câu cơ chế giải thích vì sao A dẫn đến B.',
      'Nếu dùng nhượng bộ (concession), có câu phản bác hoặc so sánh mức độ để không tự đánh đổ mình.',
      'Tránh overgeneralization (all, everyone, always) khi chưa có giới hạn phạm vi.',
    ],
    stances: [
      {
        id: 'mostly_agree',
        label: 'Đồng ý phần lớn (Có nhượng bộ nhẹ)',
        description: 'Thừa nhận một khía cạnh hợp lý của phe ngược lại ở Body 1, rồi phản bác và khẳng định quan điểm đồng ý ở Body 2.',
        riskWarning: 'Rủi ro: Nếu Body 1 quá dài hoặc không phản bác được tiền đề của phe đối lập, bài dễ bị hiểu nhầm là thiếu nhất quán.',
      },
      {
        id: 'mostly_disagree',
        label: 'Phản đối phần lớn (Có nhượng bộ nhẹ)',
        description: 'Ghi nhận lý do một số người ủng hộ đề xuất ở Body 1, sau đó chỉ ra lỗ hổng và lập luận phản đối mạnh ở Body 2.',
        riskWarning: 'Rủi ro: Dễ rơi vào bẫy straw man nếu làm yếu quá mức lập luận của phe ủng hộ trước khi phản bác.',
      },
      {
        id: 'strong_one_side',
        label: 'Đồng ý hoặc Phản đối hoàn toàn (100%)',
        description: 'Cả hai đoạn thân bài tập trung đào sâu hai nhóm lý do riêng biệt bảo vệ hoàn toàn một phía.',
        riskWarning: 'Rủi ro: Dễ bị overgeneralization nếu đề bài có từ cực đoan (must, all, completely) hoặc thiếu sắc thái thực tế.',
      },
      {
        id: 'conditional_nuanced',
        label: 'Phụ thuộc điều kiện cụ thể (Conditional)',
        description: 'Tách vấn đề theo hoàn cảnh hoặc nhóm đối tượng cụ thể, chỉ rõ khi nào đúng và khi nào sai.',
        riskWarning: 'Rủi ro: Rất dễ bị giám khảo đánh giá là lập trường mơ hồ ("cái gì cũng tùy") nếu thiếu một câu chốt ranh giới rõ ràng.',
      },
    ],
  },
  {
    id: 'discuss_both',
    name: 'Discuss both views',
    shortName: 'Both views',
    signals: 'Discuss both these views and give your own opinion.',
    checklist: [
      'Trình bày đầy đủ cả hai quan điểm (Body 1 cho View A, Body 2 cho View B) với dung lượng cân đối.',
      'Thể hiện rõ quan điểm cá nhân (your own opinion) ngay từ Introduction, xuyên suốt Body và chốt lại ở Conclusion.',
      'Trình bày quan điểm mình không ủng hộ ở dạng mạnh nhất (steelmanning), không biến thành straw man.',
      'Tách biệt rõ câu nói về "người khác nghĩ" và "tôi cho rằng" để giám khảo nhận diện đúng lập trường.',
      'Giải thích cơ chế cho cả hai góc nhìn thay vì chỉ liệt kê khẩu hiệu.',
    ],
    stances: [
      {
        id: 'favor_view_2',
        label: 'Phân tích View 1, nghiêng về View 2',
        description: 'Body 1 trình bày khách quan lý do của View 1 (kèm giới hạn), Body 2 khẳng định và đào sâu View 2 là quan điểm mình ủng hộ.',
        riskWarning: 'Rủi ro: Hay bị lệch dung lượng (Body 1 quá sơ sài) khiến phần thảo luận View 1 không đạt yêu cầu "adequately covered".',
      },
      {
        id: 'favor_view_1',
        label: 'Ủng hộ View 1 sau khi xét View 2',
        description: 'Body 1 phân tích View 2 ở góc độ hợp lý nhất, Body 2 bảo vệ View 1 với lập luận vượt trội hơn.',
        riskWarning: 'Rủi ro: Cần đảm bảo thứ tự nêu trong Introduction khớp với mạch chuyển ý giữa hai đoạn thân bài.',
      },
      {
        id: 'balanced_synthesis',
        label: 'Kết hợp cả hai quan điểm có điều kiện',
        description: 'Phân tích giá trị của từng góc nhìn và kết luận cả hai cần bổ trợ nhau thay vì loại trừ tuyệt đối.',
        riskWarning: 'Rủi ro: Dễ mất điểm Task Response nếu kết luận chung chung ("cả hai đều đúng") mà không nêu tiêu chí ưu tiên.',
      },
    ],
  },
  {
    id: 'advantages_disadvantages',
    name: 'Advantages - Disadvantages',
    shortName: 'Adv - Disadv',
    signals: 'Do the advantages outweigh the disadvantages? / What are the advantages and disadvantages?',
    checklist: [
      'Xác định rõ đề chỉ hỏi liệt kê mặt lợi/hại hay hỏi so sánh "outweigh" (có yêu cầu lập trường).',
      'Nêu rõ cả ưu điểm và nhược điểm với cơ chế phân tích rõ ràng, không chỉ kể tên.',
      'Nếu đề hỏi "outweigh", phần nghiêng về phải có lập luận so sánh mức độ/tác động (net effect).',
      'Tránh tự đánh đổ mình: không bác bỏ lợi ích vì "tạm thời" trong khi tác hại cũng chỉ mang tính ngắn hạn.',
      'Dùng chuỗi quy mô (cá nhân -> cộng đồng -> xã hội) để ý có chiều sâu.',
    ],
    stances: [
      {
        id: 'adv_outweigh',
        label: 'Lợi ích vượt trội hơn tác hại (Advantages outweigh)',
        description: 'Body 1 thừa nhận các bất lợi đáng kể, Body 2 chứng minh lợi ích dài hạn và rộng hơn hẳn.',
        riskWarning: 'Rủi ro: Nếu chỉ liệt kê lợi ích mà không giải thích vì sao chúng nặng ký hơn bất lợi, phần "outweigh" sẽ bị đánh giá nông.',
      },
      {
        id: 'disadv_outweigh',
        label: 'Tác hại lớn hơn lợi ích (Disadvantages outweigh)',
        description: 'Body 1 ghi nhận lợi ích trước mắt, Body 2 phân tích hệ lụy sâu rộng và khó khắc phục hơn.',
        riskWarning: 'Rủi ro: Dễ phóng đại tác hại thành thảm họa không thực tế nếu thiếu câu giới hạn phạm vi.',
      },
      {
        id: 'objective_both',
        label: 'Phân tích cân bằng hai mặt (Khi đề không hỏi outweigh)',
        description: 'Body 1 phân tích nhóm lợi ích cốt lõi, Body 2 phân tích nhóm bất lợi chính một cách khách quan.',
        riskWarning: 'Rủi ro: Tuyệt đối không dùng stance này nếu đề có cụm "Do the advantages outweigh..." vì sẽ bị coi là thiếu position.',
      },
    ],
  },
  {
    id: 'problem_solution',
    name: 'Problem - Solution / Cause - Solution',
    shortName: 'Problem - Sol',
    signals: 'What are the causes/problems and what solutions can you suggest?',
    checklist: [
      'Trả lời cân đối cả hai vế của đề: Nguyên nhân/Vấn đề ở Body 1 và Giải pháp ở Body 2.',
      'Mỗi giải pháp ở Body 2 phải khớp trực tiếp với nguyên nhân hoặc vấn đề đã nêu ở Body 1.',
      'Nêu rõ chủ thể thực hiện giải pháp (chính phủ, doanh nghiệp, cá nhân) và cơ chế tạo ra kết quả.',
      'Không tự thêm nguyên nhân nếu đề chỉ hỏi "problems and solutions", và không tự thêm giải pháp nếu đề chỉ hỏi "causes and effects".',
      'Tránh giải pháp sáo rỗng kiểu "nâng cao nhận thức" mà không giải thích cách làm cụ thể.',
    ],
    stances: [
      {
        id: 'policy_and_individual',
        label: 'Kết hợp chính sách nhà nước & thay đổi hành vi cá nhân',
        description: 'Body 1 phân tích 2 nguyên nhân/vấn đề gốc rễ; Body 2 đề xuất giải pháp cấp vĩ mô (luật, hạ tầng) và vi mô (giáo dục, thói quen).',
        riskWarning: 'Rủi ro: Nếu liệt kê quá 3 giải pháp rời rạc, mỗi giải pháp chỉ còn 1 câu và không đủ chiều sâu cơ chế.',
      },
      {
        id: 'systemic_structural',
        label: 'Tập trung giải pháp hệ thống (Chính phủ & Doanh nghiệp)',
        description: 'Chỉ ra nguyên nhân mang tính cấu trúc kinh tế-xã hội và đề xuất cơ chế điều tiết, tài trợ hoặc quy định bắt buộc.',
        riskWarning: 'Rủi ro: Cần nhắc đến tính khả thi hoặc rào cản thực thi để tránh giải pháp nghe quá lý tưởng hóa.',
      },
    ],
  },
  {
    id: 'two_part',
    name: 'Two-part question',
    shortName: 'Two-part',
    signals: 'Hai câu hỏi riêng biệt (ví dụ: Why is this happening? Is it a positive or negative development?)',
    checklist: [
      'Xác định chính xác cả hai câu hỏi và dành riêng Body 1 cho Câu hỏi 1, Body 2 cho Câu hỏi 2.',
      'Độ dài và chiều sâu phát triển của hai đoạn thân bài tương đương nhau.',
      'Trả lời rõ ràng câu trả lời trực tiếp cho cả hai câu hỏi ngay trong Introduction và tóm tắt ở Conclusion.',
      'Kiểm tra phạm vi đề: nếu không có câu hỏi nào yêu cầu giải pháp, tuyệt đối không viết thêm giải pháp.',
      'Đảm bảo ý ở Body 1 và Body 2 liên kết logic, không mâu thuẫn nhau.',
    ],
    stances: [
      {
        id: 'direct_positive',
        label: 'Giải thích câu hỏi 1 + Đánh giá tích cực ở câu hỏi 2',
        description: 'Body 1 làm rõ nguyên nhân/yếu tố cốt lõi; Body 2 khẳng định xu hướng tích cực (kèm thừa nhận ngắn về rủi ro nhỏ).',
        riskWarning: 'Rủi ro: Dễ viết quá dài ở câu hỏi nguyên nhân (Body 1) khiến câu hỏi đánh giá (Body 2) bị hụt hơi.',
      },
      {
        id: 'direct_negative',
        label: 'Giải thích câu hỏi 1 + Đánh giá tiêu cực ở câu hỏi 2',
        description: 'Body 1 làm rõ bối cảnh/động lực; Body 2 phân tích vì sao hệ quả tổng thể nghiêng về tiêu cực.',
        riskWarning: 'Rủi ro: Tránh lặp lại ý giữa hai đoạn (ví dụ vừa dùng một lý do làm nguyên nhân vừa lặp nguyên văn làm hệ quả).',
      },
      {
        id: 'direct_conditional',
        label: 'Giải thích câu hỏi 1 + Đánh giá phụ thuộc điều kiện ở câu hỏi 2',
        description: 'Body 1 trả lời trực tiếp vế 1; Body 2 nêu rõ điều kiện để xu hướng này trở nên tích cực hay tiêu cực.',
        riskWarning: 'Rủi ro: Phải chốt rõ lập trường cuối cùng ở câu chủ đề Body 2 và Conclusion để tránh bị xem là thiếu quyết đoán.',
      },
    ],
  },
];

export function getEssayTypeConfig(id: EssayTypeId): EssayTypeConfig {
  return ESSAY_TYPES.find((t) => t.id === id) ?? ESSAY_TYPES[0];
}

export const BAND_9_STYLE_PRINCIPLES = [
  {
    title: 'Khung 4 đoạn cân đối (290–340 từ)',
    detail: 'Introduction (paraphrase + position có giới hạn nhẹ) → Body nhượng bộ → Body chính → Conclusion 1–2 câu, không thêm ý mới.',
  },
  {
    title: 'Nhượng bộ có nhãn chức năng rõ ràng',
    detail: 'Dùng các khung tự nhiên như "Granted, one might argue...", "This is predicated on the assumption that...", "However, this line of reasoning is flawed because...".',
  },
  {
    title: 'Nhịp lập luận gãy gọn, không bịa số liệu',
    detail: 'Claim → "This is because..." / "The reason for this is..." → hệ quả cụ thể → câu chốt. Không bịa phần trăm hay tên nghiên cứu.',
  },
  {
    title: 'Collocation chuẩn ngữ cảnh & liên kết mạch lạc',
    detail: 'Dùng danh hóa và collocation tự nhiên (exacerbate environmental issues, preclude the need for, curb their carbon footprint), dùng đại từ thay thế (this trend, such a proposal) thay vì lặp từ khóa.',
  },
];

export const SAMPLE_DEMO_ESSAY = {
  essay_type: 'opinion' as EssayTypeId,
  prompt:
    'Some countries import a large amount of food from other countries. To what extent is this a positive or negative trend?',
  essay: `Food supply is of obvious critical importance to secure a country's existence. A country's self-sustenance regarding supplying its own food is optimal, but its importation is sometimes necessary, fortunately viable and mostly non-problematic - assuming catastrophic world-conditions do not force isolationism.

Ideally, individual countries should be at least potentially self-sufficient if not autonomous regarding food production for their population. But what is ideal is often not real. Blameworthy causalities for a nation's food shortage include political malfeasance, governmental ineptitude, and war. Non-blameworthy causalities include a sometimes - whimsical global economy and natural changing climate patterns inhibiting agricultural production - history provides countless, millennia-old examples of once thriving regions eventually vanishing due to either freezing or desertification. Hence, regardless of the cause, securing viable sources of food as imports for countries unable to produce enough is positive and humane - at least in that it reduces or prevents domestic malnutrition and potential starvation.

Food importation is also positive because it stimulates economic activity, creates cross-cultural partnerships, and promotes opportunity to enjoy regionally exotic foods. Agribusiness is a worldwide, multinational enterprise providing millions of jobs and national revenue. Food importation also facilitates complex intertwinement and engagement of various countries with each other. This engagement promotes cooperation and reduces potential conflict, namely war. Additionally, with food imports people can experiment with different international staples, herbs, spices, or regional delicacies - such experimentation brings comfort and joy to the masses.

In conclusion, catastrophic world-conditions could force certain countries into isolation, consequently food - supply independence would be paramount. Barring such a catastrophe, the importation of food among nations is a positive trend.`,
};

export const SAMPLE_DEBATE_PROMPT = {
  prompt:
    'Nations should spend more money on skills and vocational training for practical work (e.g. hairdressing, car maintenance), rather than on university education. To what extent do you agree or disagree?',
  outline: `Position: Đồng ý một phần, nhưng phần lớn quốc gia vẫn nên ưu tiên đại học.
Body 1: Một số nước thừa cử nhân thất nghiệp, thiếu thợ lành nghề (thợ sửa xe, thợ cắt tóc) nên cần đầu tư thêm học nghề.
Body 2: Giáo dục đại học đào tạo nhân lực trình độ cao, thích nghi tốt hơn khi tự động hóa và AI thay thế công việc tay chân.`,
};
