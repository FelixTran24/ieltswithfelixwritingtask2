import fs from 'node:fs';
import path from 'node:path';

function readPublicAsset(relativePath: string, fallback: string): string {
  try {
    const fullPath = path.resolve(process.cwd(), 'public', relativePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8');
    }
  } catch {
    // Fallback to embedded string
  }
  return fallback;
}

const FALLBACK_SYSTEM_INSTRUCTION = `# Vai trò
Bạn là cựu giám khảo IELTS và IELTS Writing coach lâu năm, khó tính nhưng công bằng. Giao tiếp bằng tiếng Việt, giữ thuật ngữ và từ vựng bằng tiếng Anh. Nhiệm vụ: chấm bài IELTS Writing Task 2 theo 4 tiêu chí và phản biện ý tưởng.
Không dùng bất kỳ emoji nào trong câu trả lời.`;

export const USER_SYSTEM_INSTRUCTION = readPublicAsset(
  'assets/aistudio/system_instruction_3f817e0e.md',
  FALLBACK_SYSTEM_INSTRUCTION
);

export const CALIBRATION_JSON_TEXT = readPublicAsset(
  'assets/aistudio/calibration_e2512f95.json',
  '{}'
);

export const COACH_SKILL_TEXT = readPublicAsset(
  'assets/aistudio/SKILL_15093857.md',
  ''
);

/**
 * 6 Band 9 reference essays from the attached PDF (by Kien Luyen).
 * Used strictly for:
 * 1. Grading calibration (anything done in these Band 9 essays is NOT penalized).
 * 2. Prose/style reference when generating Band 9 sample essays (never learn language from user essays).
 */
export const BAND_9_REFERENCE_ESSAYS = `
=== 6 BÀI MẪU BAND 9 THAM CHIẾU (CHỈ HỌC HÀNH VĂN VÀ CHUẨN CHẤM TỪ ĐÂY) ===

[BÀI 1 - POSITIVE OR NEGATIVE]
Prompt: In some cultures, ambition is thought to be a good quality. Is it important to be ambitious? Is it a positive or negative characteristic?
Essay:
In many parts of the world, ambition is often held in high regard, with individuals having ambitious goals often being praised and celebrated. I do believe that it is important for people to be ambitious, and it is a positive personal trait, when exercised within reasonable boundaries.
It has to be acknowledged that having certain ambitions provides people with a sense of direction in life. This can be seen in the way unemployed individuals who contentedly live off of unemployment benefits usually feel lost and end up engaging in unproductive activities such as watching TV all day, gossiping, and committing minor crimes such as vandalism, ultimately causing trouble for themselves, their families and their communities as a whole. However, sociologists, psychologists and psychoanalysts have conclusively found that if such individuals set out certain goals for themselves, they can usually turn their lives around and become productive members of society. This is a testament to the importance of striving to obtain certain achievements or milestones in one's life.
I am convinced that ambition is generally a positive characteristic, if employed within sensible limits. Of course, there are cases where some individuals try to achieve impossible goals, leading to mental, physical exhaustion, psychological problems such as anxiety and depression, lower self-esteem and even suicidal thoughts. However, under normal circumstances, when ambition is utilized in a responsible manner, it encourages people to strive for greatness and achieve more in life. For example, students who want to top their class tend to be more focused and attain better academic results than their less academically driven peers. Similarly, athletes who wish to break the world's record in their sports have more motivation to practice and compete. Even if they do not succeed in setting a new world's record, their ability usually ends up being far superior than those without such an ambitious aspiration. These are just two among countless other examples showing the positive results that stem from pursuing ambitious goals in life.
In conclusion, it is of great importance that people establish certain goals for themselves in life, and being ambitious is predominantly a positive personal quality, especially when exploited properly.

[BÀI 2 - BAND 9.0 - AGREE OR DISAGREE]
Prompt: All children must stay at school until 18. Do you agree or disagree?
Essay:
There is an opinion that not until the age of eighteen should children be allowed to leave school. Personally, I disagree with this school of thought given its impracticality and the stultifying effects it has on many young people.
Granted, one might argue that forcing every child to finish high school education confers substantial benefits, on both personal and societal levels. This is predicated on the assumption that those under the age of 18 are usually not mature enough, and thus cannot sufficiently protect themselves. As a result, they may fall prey to exploitation, which is a poor preparation for their adulthood, or may be tricked into committing crimes, which could destabilize society. However, this line of reasoning is not sound because it fails to factor in the plight of many children. For homeless children, for example, their only worry is probably about when or even whether they have their next meal, and so it would be almost entirely fruitless to force them to go to school. There are also question marks over who would pay their school fees, food and perhaps shelter, if they were to forcibly stay at school full-time.
In addition to the questions regarding the efficacy and plausibility of this proposal, I note that children with special abilities and passions should be permitted to leave school earlier. For example, children who are musically talented and wish to become singers in the future should spend their precious time making music, and building their reputation rather than learning academic subjects. Of course, that is not to say that they should downplay the importance of academic subjects like Maths, Physics or Biology. However, their ability to perform on the stage later on is what matters the most, not their academic knowledge.
In conclusion, forcing everyone to stay at school until 18 years of age would simply be impractical and could hinder the development of many children. Therefore, I strongly feel that such a proposal should not be adopted.

[BÀI 3 - BAND 9.0 - POSITIVE OR NEGATIVE (294 words)]
Prompt: Thanks to low-cost airlines, many people can travel abroad. Is it a positive or negative development?
Essay:
It is true that the increasing affordability of modern modes of transportation such as airplanes, coupled with their easy access, has allowed people to travel abroad more easily. While recognizing the potential environmental problems that might arise, I believe that this development is tremendously positive for individuals, societies and the global economy.
Of course, it has to be acknowledged that increased cross-border tourism can exacerbate some environmental issues. The reason for this is that traveling abroad usually requires the use of flights, which consume large amounts of fossil fuels and at the same time emit significant amounts of harmful gases such as carbon monoxide, carbon dioxide and nitrogen monoxide into the air. The resulting problems include the rapid depletion of natural resources and rising air pollution levels.
Although these environmental concerns are legitimate, the benefits of this trend are far more considerable. On an individual level, those who travel to other countries can experience first-hand other ways of life, customs and traditions, and this can broaden their minds. Some travelers have also found a niche market for their talent or products when they paid a visit to another country. From cultural and societal perspectives, international tourism more often than not leads to greater cultural understanding and sensitivity, both of which can result in fewer conflicts caused by cultural differences. Finally, there are also economic benefits to increased international tourism. This is because tourists often have to use various services such as flights, accommodation, food and transportation over the course of the trip.
In conclusion, despite the disadvantages for the environment, including the depletion of natural resources and greater air pollution levels, the fact that people can travel overseas more easily and conveniently should be considered a welcome development for individual, social and economic reasons.

[BÀI 4 - BAND 9 - BOTH VIEWS]
Prompt: Some people say that parents need to spend time on reading or telling stories to children, while others think parents no longer have to do this because there are other sources for stories such as books, TV and the Internet. Discuss both these views and give your own opinion.
Essay:
There are those who believe that modern parents no longer have to spend time reading stories to their children, given the availability of alternative sources for stories such as books, TV programs and the internet. However, others, myself included, argue that this practice should still be maintained, as it benefits children's linguistic development and fosters stronger bonds within the family.
Admittedly, it has to be acknowledged that children can now access a wide range of stories without parents' involvement. For example, there are many children's books that contain age-appropriate stories with eye-catching illustrations to pique and retain young readers' interest. TV programs are another platform where storytelling has become more immersive, with animated pictures, along with well-blended sounds, which can enhance children's understanding, thanks to the visual and audio aid. Similarly, a large number of YouTube channels are dedicated to telling stories such as My Story Animated, allowing children to enjoy their favorite stories in a fun and immersive way.
However, the availability of these mediums does not preclude the need for parents to tell stories to their young ones. The key reason is that young children are bound to encounter linguistic problems such as unfamiliar syntax, and the use of advanced vocabulary and/or grammar, when they read or watch stories on their own. This can affect their understanding and ultimately their language and cognitive development. These problems can be easily resolved if parents are involved in storytelling because they can offer explanations and rephrase difficult concepts in simpler language. Furthermore, parents who have a habit of telling stories to their children often have more intimate relationships with them, fostering a more harmonious family environment. In fact, parents who often read bed-time stories to their infants tend to have an easier time dealing with their teenage years later due to the close-knit relationships established early on.
In conclusion, although children's stories are readily available and easily accessible on other platforms, parents should still spare time to read stories to their children to better facilitate their development and build tight-knit relationships with them.

[BÀI 5 - BAND 9 - AGREE OR DISAGREE]
Prompt: Some believe instead of trying to fight climate change, we should learn to live with it. To what extent do you agree or disagree?
Essay:
Climate change is indeed presenting an existential threat to humankind. Despite this, there are those who believe that we should try to adapt to the effects of climate change rather than attempting to combat it. While acknowledging the reasons for this thinking, I believe that we should make every effort to address this problem.
Of course, one might argue that it is easier to cope with climatic changes than trying to slow down or reverse the process of climate change. This is predicated on the assumption that combating this problem would require colossal amounts of resources and international collaboration, both of which render such an effort futile. According to this theory, trying to adapt to the effects of climate change would be more practical. For example, in order to deal with rising temperatures, we can equip our homes with air-conditioners. Similarly, governments can safeguard their residents in low-lying coastal areas by building sea walls to address the problem of rising sea levels.
However, this line of reasoning is flawed, as climatic changes observed in most parts of the world are human-induced, meaning that changes in individuals' lifestyles, business practices and legislation can help tackle this problem. For instance, individuals can avoid making non-essential car trips and flights while shifting from personal vehicles to greener modes of transport such as buses and trains, which can greatly curb their carbon footprint. They also wield the power to push industries towards the direction of sustainability, for example by threatening to boycott businesses that harm the environment and by supporting those that weave environmental responsibility and stewardship into their practices. At the same time, industries should proactively use renewable energy sources and adopt eco-friendly practices and technologies to reduce their impact on the environment. Finally, governments can introduce and enforce stricter environmental laws to ensure that individuals and businesses are pushed towards sustainability. These actions can be easily taken on both local and international levels and can effect meaningful changes in the fight against climate change.
In conclusion, it is a mistake to assume that we should learn to adapt to the consequences of climate change. Instead, every effort should be made by all stakeholders, including individuals, businesses and governments, to change the status quo of this issue and ensure a sustainable future for all.

[BÀI 6 - BAND 9 - AGREE OR DISAGREE (341 words)]
Prompt: Nations should spend more money on skills and vocational training for practical work (e.g hairdressing, car maintenance), rather than on university education. To what extent do you agree or disagree?
Essay:
There are those who propose that countries should allocate more resources for providing skills and vocational programs for workers doing practical jobs such as hairdressing and car maintenance instead of focusing too much on higher education. While this proposal can be beneficial in some special cases, the vast majority of countries should continue prioritizing university education.
It is true that there are countries that have a surplus of university graduates, but lack people who can do practical work. This can be seen in countries such as Vietnam, Korea and China, which have focused their resources on tertiary education for decades. This has resulted in a high unemployment rate among bachelor's degree holders, and a shortage of laborers doing practical work such as hairdressing and car maintenance, leading to a waste of human resources, widespread social discontentment, resentment, and a lower quality of life for the general population. Therefore, such countries would indeed benefit from redirecting resources towards vocational training schemes.
For most countries, however, investing in the university system would yield far greater benefits. This is because further education can equip young individuals with up-to-date in-depth knowledge and insights into different aspects of life, leading to a more skilled and adaptable workforce that can bring about sustainable development. The cultivation of such a workforce is important in today's rapidly changing world because technological breakthroughs can disrupt the work patterns in various industries, potentially displacing workers who have a limited range of skills and expertise, including even those doing practical work such as hairdressing and car repair. For example, the adoption of automation in factories in many parts of the world has replaced a large number of workers on production lines for the sake of increased productivity and reduced operating costs.
In conclusion, some countries might reap more benefits from the reallocation of funding towards skills and vocational training programs. However, most countries should prioritize the university system given how this decision can produce a more skilled and adaptable labor force that can better deal with rapid changes in today's ever-evolving world.
`;

export function buildGradingSystemInstruction(): string {
  return `${USER_SYSTEM_INSTRUCTION}

=== QUY TẮC BỔ SUNG QUAN TRỌNG ===
- TUYỆT ĐỐI KHÔNG dùng bất kỳ emoji nào ở bất kỳ trường nào trong JSON.
- KHÔNG gắn nhãn "điểm chính thức". Luôn xem điểm là ước lượng theo band descriptor.
- KHÔNG học hay sao chép ngôn ngữ từ bài viết người học nhập. Chỉ dùng 6 bài mẫu Band 9 tham chiếu bên dưới làm chuẩn chấm.
- Trong mảng "criteria_analysis": phải có đủ 4 phần tử cho TR, CC, LR, GRA, mỗi tiêu chí nêu rõ điểm mạnh (strengths), điểm yếu (weaknesses), và điều cần sửa cụ thể (fixes).
- Trong mảng "edits": chọn 5 đến 10 đoạn chỉnh sửa/bình luận giá trị nhất trong bài viết của người học.
  + Trường "original_text" PHẢI trích xuất NGUYÊN VĂN chính xác từng chữ từ bài viết của người học (độ dài ngắn gọn 3-25 từ) để ứng dụng định vị trực tiếp trên bài làm.
  + "action":
    * "delete": khi đề nghị xóa bỏ cụm từ thừa/sai (suggested_text để rỗng "").
    * "replace": khi đề nghị thay thế cụm từ bằng diễn đạt đúng/tự nhiên hơn (ghi bản thay thế trong suggested_text).
    * "insert": khi đề nghị bổ sung cụm từ ngay sau original_text (ghi phần bổ sung trong suggested_text).
    * "comment": khi chỉ highlight vàng nhạt để góp ý về ý tưởng, cơ chế, lập trường hoặc liên kết (suggested_text để rỗng "").
  + "comment": giải thích ngắn gọn bằng tiếng Việt lý do sửa/bình luận.
- "coach_questions": tối đa 2 câu hỏi gợi mở để người học tự nâng chất lượng ý tưởng.

=== DỮ LIỆU HIỆU CHỈNH (CALIBRATION) ===
${CALIBRATION_JSON_TEXT}

${BAND_9_REFERENCE_ESSAYS}
`;
}

export function buildSampleEssaySystemInstruction(): string {
  return `Bạn là chuyên gia IELTS Writing Task 2. Nhiệm vụ: viết bài mẫu tham khảo theo phong cách Band 9 dựa trên 6 bài mẫu tham chiếu đính kèm.

QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG dùng emoji.
2. CHỈ học hành văn, cấu trúc câu, cách nhượng bộ, cách dùng danh hóa và collocation từ 6 bài mẫu Band 9 tham chiếu bên dưới. TUYỆT ĐỐI KHÔNG mượn câu chữ hay cách diễn đạt từ bài làm của người học.
3. Ý tưởng phải gãy gọn, logic chặt chẽ theo chuỗi nguyên nhân -> cơ chế -> kết quả -> giới hạn, 1 ví dụ cụ thể hợp lý cho mỗi ý chính, KHÔNG bịa số liệu hay tên nghiên cứu.
4. Cấu trúc BẮT BUỘC đúng 4 đoạn (Introduction, Body 1, Body 2, Conclusion), tổng độ dài nghiêm ngặt trong khoảng 290–340 từ tiếng Anh.
5. Không lạm dụng cụm khuôn (như "It has to be acknowledged that") quá 1 lần mỗi bài.
6. Kèm 3-4 ghi chú ngắn bằng tiếng Việt giải thích kỹ thuật hành văn đã áp dụng (style_notes) và bảng 8-12 cụm collocation/từ vựng C1-C2 đắt giá xuất hiện trong bài kèm nghĩa tiếng Việt chính xác (vocabulary).

${BAND_9_REFERENCE_ESSAYS}
`;
}

export function buildDebateSystemInstruction(): string {
  return `Bạn là cựu giám khảo IELTS và IELTS Writing coach khó tính, đóng vai đối thủ tranh biện (Debate Partner) theo hướng dẫn sau:

${COACH_SKILL_TEXT}

QUY TẮC BẮT BUỘC CHO CHẾ ĐỘ TRANH BIỆN:
1. Giao tiếp bằng tiếng Việt, giữ thuật ngữ IELTS và cụm từ vựng tiếng Anh. TUYỆT ĐỐI KHÔNG dùng emoji.
2. KHÔNG viết bài mẫu, KHÔNG đưa dàn ý hoàn chỉnh hay liệt kê sẵn ý tưởng thay người học.
3. Mỗi lượt CHỈ tập trung vào MỘT khía cạnh yếu nhất trong lập luận của người học, và hỏi TỐI ĐA 2 câu hỏi ngắn, sắc bén.
4. Liên tục kiểm tra các lỗ hổng: overgeneralization, thiếu cơ chế (mechanism: vì sao A dẫn đến B), thiếu ví dụ cụ thể, lạc đề / sai phạm vi đề, mâu thuẫn giữa các body, lỗi net effect, hoặc straw man.
5. Nếu người học phản biện lại, chấm rõ phần nào trúng, phần nào trúng một phần, phần nào còn hụt — không khen xã giao hay đồng ý dễ dãi.
6. Khi một ý đã trụ vững sau phản biện, có thể gợi ý ngắn 2-3 collocation C1/C2 tự nhiên cho ý đó.
7. Ngắn gọn, đi thẳng vào vấn đề, không lặp lại ý đã nói ở lượt trước.
`;
}

export function buildOutlineCoachSystemInstruction(): string {
  return `Bạn là cựu giám khảo IELTS và IELTS Writing coach lâu năm, cực kỳ chặt chẽ về logic lập luận Task 2.
Giao tiếp bằng tiếng Việt, giữ thuật ngữ tiếng Anh. TUYỆT ĐỐI KHÔNG dùng emoji.
Nguyên tắc lập luận cốt lõi:
- Chuỗi lập luận rõ ràng: Nguyên nhân -> Cơ chế (vì sao A dẫn đến B) -> Kết quả -> Giới hạn (scope/điều kiện).
- Mỗi ý chính kèm đúng 1 ví dụ cụ thể, thực tế, KHÔNG bịa số liệu phần trăm hay tên nghiên cứu khoa học.
- Đảm bảo 4 đoạn cân đối (Introduction, Body 1, Body 2, Conclusion), bám sát phạm vi đề (TR audit).
- Chỉ dùng từ vựng/collocation chuẩn học thuật C1-C2 tự nhiên theo phong cách bài mẫu Band 9 (không nhồi từ sáo rỗng).
`;
}
