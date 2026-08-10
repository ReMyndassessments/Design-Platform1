/**
 * Full policy content for all 16 PIPL compliance documents.
 * Available in English (en), Simplified Chinese (zh), and Korean (ko).
 * Status: Draft — pending legal review. Do not publish to users without approval.
 */

export interface PolicyContent {
  name: string;
  content_en: string;
  content_zh: string;
  content_ko: string;
}

export const POLICY_CONTENT: PolicyContent[] = [
  // ─────────────────────────────────────────────────────────────────
  // 1. China Privacy Notice
  // ─────────────────────────────────────────────────────────────────
  {
    name: "China Privacy Notice",
    content_en: `# China Privacy Notice

**Effective Date:** [To be confirmed upon legal approval]
**Version:** 1.0 (Draft)
**Document Owner:** Compliance Officer

---

## 1. Who We Are

ReMynd Technology ("ReMynd," "we," "us," or "our") operates the ReMynd Assessment Operating System (RAOS), a professional psychological assessment platform for schools and educational institutions. This notice explains how we collect, use, store, share, and protect personal information in accordance with the Personal Information Protection Law of the People's Republic of China (PIPL) and related regulations.

## 2. What Personal Information We Collect

We collect the following categories of personal information:

**Student Information**
- Name, date of birth, gender, grade, and school enrollment details
- Referral concerns and presenting difficulties described by teachers or parents
- Psychological assessment questionnaire responses and standardised test scores
- Audio and video recordings made during assessment sessions (where consent has been obtained)
- AI-generated assessment analysis and clinical report content

**Parent / Guardian Information**
- Name, relationship to student, and contact information
- Consent declarations and communication records

**School Staff Information**
- Name, role, school, and contact email
- Assessment referral notes and case observations

**Account and Usage Information**
- Login credentials, session identifiers, and access logs
- Billing records (processed via Airwallex; card details are not stored by ReMynd)

## 3. Sensitive Personal Information

The following sensitive personal information (SPI) is processed under additional protections:
- **Health and psychological information** (assessment scores, clinical observations)
- **Information about minors under 14 years of age**
- **Biometric-adjacent data** (audio recordings of sessions)

SPI is only processed with separate, explicit written consent and is subject to stricter access controls.

## 4. How We Use Personal Information

We use personal information to:
- Conduct, score, and report on psychological assessments
- Generate AI-assisted case analysis and clinical reports
- Enable communication between psychometricians, schools, and parents
- Provide the case management portal for schools
- Maintain billing and subscription records
- Comply with our legal obligations and respond to rights requests

We do not use personal information for advertising, profiling for unrelated purposes, or sale to third parties.

## 5. Legal Basis for Processing

| Purpose | Legal Basis |
|---------|-------------|
| Assessment services under a school agreement | Contract performance |
| AI analysis and report generation | Separate informed consent |
| Audio/video recording | Separate explicit consent |
| Billing | Contract performance |
| Security and audit logging | Legitimate interest / Legal obligation |

## 6. Cross-Border Data Transfers

Certain processing activities involve transferring personal information outside mainland China, including to service providers in the United States. These transfers are described in our Cross-Border Data Transfer Notice. We take steps to ensure adequate protection via contractual safeguards and, where required, complete the security assessment process under PIPL.

## 7. How Long We Keep Personal Information

| Data Category | Retention Period |
|---------------|-----------------|
| Assessment records and reports | 7 years after case closure |
| Audio/video recordings | 1 year after case closure |
| Account information | Duration of active relationship + 2 years |
| Billing records | 7 years (statutory) |
| Security audit logs | 1 year |

After the retention period, data is securely deleted or anonymised.

## 8. Your Rights

Under PIPL, you have the right to:
- **Access** a copy of your personal information
- **Correct** inaccurate personal information
- **Delete** personal information (subject to legal retention obligations)
- **Restrict** or object to certain processing
- **Withdraw consent** for consent-based processing (this does not affect processing already completed)
- **Obtain a copy** (data portability)
- **Explanation** of automated decision-making that significantly affects you

To exercise these rights, see our Privacy Rights Request Procedure or contact us at privacy@remynd.com.

## 9. Children's Information

We treat information about minors with the highest level of care. Parental or guardian consent is obtained before processing any information about a child under 14. See our Children's Personal Information Protection Policy for full details.

## 10. Security

We implement technical and organisational measures including encryption in transit and at rest, role-based access controls, audit logging, and regular security reviews. See our Information Security Policy for details.

## 11. How to Contact Us

**Privacy Enquiries:** privacy@remynd.com
**Data Protection Officer:** [To be appointed]
**Postal Address:** [ReMynd registered address — to be confirmed]

## 12. Changes to This Notice

We will notify you of material changes to this notice by email or prominent notice within the platform before changes take effect. The version history is maintained internally.`,

    content_zh: `# 中国隐私声明

**生效日期：** [经法律审批后确认]
**版本：** 1.0（草稿）
**文件责任人：** 合规官

---

## 1. 关于我们

ReMynd科技（以下简称"ReMynd"、"我们"或"本公司"）运营ReMynd评估操作系统（RAOS），这是一个面向学校和教育机构的专业心理评估平台。本声明说明我们如何依照《中华人民共和国个人信息保护法》（以下简称"个保法"）及相关法规收集、使用、存储、共享和保护个人信息。

## 2. 我们收集的个人信息

我们收集以下类别的个人信息：

**学生信息**
- 姓名、出生日期、性别、年级及就读学校信息
- 由教师或家长描述的转介原因及呈现问题
- 心理评估问卷答案及标准化测试分数
- 评估过程中录制的音频和视频（需获得同意）
- AI生成的评估分析和临床报告内容

**家长/监护人信息**
- 姓名、与学生的关系及联系方式
- 同意声明及沟通记录

**学校工作人员信息**
- 姓名、职务、学校及联系邮箱
- 评估转介记录及案例观察

**账号及使用信息**
- 登录凭证、会话标识符及访问日志
- 账单记录（通过Airwallex处理；ReMynd不存储银行卡信息）

## 3. 敏感个人信息

以下敏感个人信息（SPI）受到额外保护：
- **健康和心理信息**（评估分数、临床观察）
- **14周岁以下未成年人信息**
- **类生物特征数据**（会话录音）

敏感个人信息仅在获得单独书面明示同意后处理，并受到更严格的访问控制。

## 4. 我们如何使用个人信息

我们使用个人信息用于：
- 开展、评分并报告心理评估
- 生成AI辅助案例分析和临床报告
- 支持心理测量师、学校和家长之间的沟通
- 为学校提供案例管理门户
- 维护账单和订阅记录
- 履行我们的法律义务并响应权利请求

我们不将个人信息用于广告、无关目的的画像分析或向第三方出售。

## 5. 处理的法律依据

| 目的 | 法律依据 |
|------|---------|
| 基于学校协议的评估服务 | 合同履行 |
| AI分析和报告生成 | 单独知情同意 |
| 音频/视频录制 | 单独明示同意 |
| 账单 | 合同履行 |
| 安全和审计日志 | 合法权益/法律义务 |

## 6. 跨境数据传输

某些处理活动涉及将个人信息传输至中国大陆以外地区，包括传输至美国的服务提供商。详情请参阅我们的《跨境数据传输通知》。我们通过合同保障措施确保充分保护，并在个保法要求时完成安全评估程序。

## 7. 我们保留个人信息的时长

| 数据类别 | 保留期限 |
|---------|---------|
| 评估记录和报告 | 案例结案后7年 |
| 音频/视频录制 | 案例结案后1年 |
| 账号信息 | 有效关系期间 + 2年 |
| 账单记录 | 7年（法定要求） |
| 安全审计日志 | 1年 |

保留期届满后，数据将被安全删除或匿名化处理。

## 8. 您的权利

根据个保法，您有权：
- **查阅**您个人信息的副本
- **更正**不准确的个人信息
- **删除**个人信息（受法定保留义务约束）
- **限制**或反对某些处理
- **撤回同意**（不影响撤回前已完成的处理）
- **获取副本**（数据可携带权）
- 对显著影响您的**自动化决策**获得解释

如需行使上述权利，请参阅我们的《隐私权利请求程序》或联系 privacy@remynd.com。

## 9. 儿童信息

我们对未成年人信息给予最高级别的保护。在处理14周岁以下儿童的任何信息之前，须获得其父母或监护人的同意。详情请参阅我们的《儿童个人信息保护政策》。

## 10. 安全保障

我们实施技术和组织措施，包括传输和存储中的加密、基于角色的访问控制、审计日志记录以及定期安全审查。详情请参阅我们的《信息安全政策》。

## 11. 联系我们

**隐私咨询：** privacy@remynd.com
**个人信息保护负责人：** [待任命]
**邮政地址：** [ReMynd注册地址——待确认]

## 12. 本声明的变更

我们将在变更生效前通过电子邮件或平台内的显著通知告知您本声明的重大变更。版本历史记录在内部维护。`,

    content_ko: `# 중국 개인정보 처리방침

**시행일:** [법률 승인 후 확정]
**버전:** 1.0 (초안)
**문서 담당자:** 컴플라이언스 책임자

---

## 1. 회사 소개

ReMynd Technology("ReMynd", "당사" 또는 "우리")는 학교 및 교육 기관을 위한 전문 심리 평가 플랫폼인 ReMynd Assessment Operating System(RAOS)을 운영합니다. 본 방침은 중국 개인정보보호법(PIPL) 및 관련 법규에 따라 당사가 개인정보를 수집, 사용, 저장, 공유 및 보호하는 방법을 설명합니다.

## 2. 수집하는 개인정보

당사는 다음 범주의 개인정보를 수집합니다:

**학생 정보**
- 이름, 생년월일, 성별, 학년 및 재학 학교 정보
- 교사나 부모가 기술한 의뢰 사유 및 주요 어려움
- 심리 평가 설문지 응답 및 표준화 검사 점수
- 평가 세션 중 제작된 음성 및 영상 녹화물 (동의 획득 시)
- AI 생성 평가 분석 및 임상 보고서 내용

**부모/보호자 정보**
- 이름, 학생과의 관계 및 연락처
- 동의 선언문 및 커뮤니케이션 기록

**학교 직원 정보**
- 이름, 역할, 학교 및 연락 이메일
- 평가 의뢰 기록 및 사례 관찰

**계정 및 사용 정보**
- 로그인 자격 증명, 세션 식별자 및 접근 로그
- 청구 기록 (Airwallex를 통해 처리; 카드 정보는 ReMynd에 저장되지 않음)

## 3. 민감한 개인정보

다음 민감한 개인정보(SPI)는 추가 보호 하에 처리됩니다:
- **건강 및 심리 정보** (평가 점수, 임상 관찰)
- **14세 미만 미성년자 정보**
- **생체정보 유사 데이터** (세션 녹음)

SPI는 별도의 명시적 서면 동의를 받은 경우에만 처리되며, 더 엄격한 접근 통제가 적용됩니다.

## 4. 개인정보 이용 목적

당사는 다음 목적으로 개인정보를 이용합니다:
- 심리 평가 실시, 채점 및 보고
- AI 보조 사례 분석 및 임상 보고서 생성
- 심리 측정사, 학교 및 부모 간 의사소통 지원
- 학교를 위한 사례 관리 포털 제공
- 청구 및 구독 기록 유지
- 법적 의무 이행 및 권리 요청 응대

당사는 광고, 무관한 목적의 프로파일링 또는 제3자 판매를 위해 개인정보를 사용하지 않습니다.

## 5. 처리의 법적 근거

| 목적 | 법적 근거 |
|------|----------|
| 학교 계약에 따른 평가 서비스 | 계약 이행 |
| AI 분석 및 보고서 생성 | 별도 고지된 동의 |
| 음성/영상 녹화 | 별도 명시적 동의 |
| 청구 | 계약 이행 |
| 보안 및 감사 로그 | 정당한 이익/법적 의무 |

## 6. 국경 간 데이터 이전

일부 처리 활동은 개인정보를 중국 본토 외부, 미국 서비스 제공업체 등으로 이전하는 것을 포함합니다. 자세한 내용은 국경 간 데이터 이전 고지를 참조하십시오. 계약적 보호 조치를 통해 적절한 보호를 보장하며, PIPL에서 요구하는 경우 보안 평가 절차를 완료합니다.

## 7. 개인정보 보유 기간

| 데이터 범주 | 보유 기간 |
|------------|---------|
| 평가 기록 및 보고서 | 사례 종료 후 7년 |
| 음성/영상 녹화물 | 사례 종료 후 1년 |
| 계정 정보 | 활성 관계 기간 + 2년 |
| 청구 기록 | 7년 (법정) |
| 보안 감사 로그 | 1년 |

보유 기간 종료 후 데이터는 안전하게 삭제되거나 익명화됩니다.

## 8. 귀하의 권리

PIPL에 따라 귀하는 다음 권리를 보유합니다:
- 개인정보 사본 **열람**
- 부정확한 개인정보 **정정**
- 개인정보 **삭제** (법정 보유 의무 적용)
- 특정 처리 **제한** 또는 반대
- 동의 기반 처리에 대한 **동의 철회** (이미 완료된 처리에는 영향 없음)
- **사본 취득** (데이터 이동권)
- 귀하에게 중대한 영향을 미치는 자동화된 의사결정에 대한 **설명**

이러한 권리 행사를 위해 개인정보 권리 요청 절차를 참조하거나 privacy@remynd.com으로 연락하십시오.

## 9. 아동 정보

당사는 미성년자 정보를 최고 수준으로 보호합니다. 14세 미만 아동에 관한 정보를 처리하기 전에 부모 또는 보호자의 동의를 받습니다. 자세한 내용은 아동 개인정보 보호 정책을 참조하십시오.

## 10. 보안

당사는 전송 및 저장 시 암호화, 역할 기반 접근 통제, 감사 로그 및 정기 보안 검토를 포함한 기술적, 조직적 조치를 시행합니다. 자세한 내용은 정보 보안 정책을 참조하십시오.

## 11. 연락처

**개인정보 문의:** privacy@remynd.com
**개인정보보호 책임자:** [선임 예정]
**우편 주소:** [ReMynd 등록 주소 — 확인 예정]

## 12. 본 방침의 변경

변경 사항이 적용되기 전에 이메일 또는 플랫폼 내 주요 공지를 통해 본 방침의 중요한 변경 사항을 알려드립니다. 버전 이력은 내부적으로 유지됩니다.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 2. Children's Personal Information Protection Policy
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Children's Personal Information Protection Policy",
    content_en: `# Children's Personal Information Protection Policy

**Effective Date:** [To be confirmed upon legal approval]
**Version:** 1.0 (Draft)
**Document Owner:** Compliance Officer

---

## 1. Purpose and Scope

This policy governs the collection, storage, use, and sharing of personal information belonging to children under 18 years of age, with heightened protections for children under 14 ("young children"), in accordance with the Provisions on the Protection of Children's Personal Information Online (PPCP), PIPL Article 31, and the Law on the Protection of Minors.

This policy applies to all ReMynd personnel, contractors, and third-party processors who handle children's personal information through the RAOS platform.

## 2. Definitions

- **Child:** A person under 18 years of age.
- **Young Child:** A person under 14 years of age — subject to the strictest protections.
- **Guardian:** A parent, legal guardian, or authorised adult responsible for the child.

## 3. Consent Requirements

### Children Under 14
- Written, verifiable consent from a parent or guardian is mandatory before any personal information is collected.
- The consent form must explain, in plain language, what information is collected, why, who it is shared with, and how the child's rights can be exercised.
- Consent is obtained via the Parent/Guardian Consent form administered through the school before assessment commences.
- For sensitive personal information (assessment results, audio recordings), a separate Sensitive Personal Information Consent is required.

### Children Aged 14–17
- Where the child is aged 14–17, consent may be co-signed by the child and their guardian.
- For sensitive processing (recordings, AI analysis), guardian consent is always required in addition to any assent from the child.

## 4. Information Minimisation

We collect only the information strictly necessary for the assessment purpose:
- Demographic details: name, date of birth, gender, grade
- Referral information provided by school or guardian
- Questionnaire responses and assessment scores
- Audio or video recording of assessment sessions (only where separate recording consent is obtained)

We do not collect: home address, government identification numbers, financial information, social media profiles, or geolocation data for children.

## 5. Storage and Access Controls

Children's personal information is subject to the following additional controls:
- Stored in dedicated database fields with encryption at rest
- Accessible only to the assigned psychometrician, designated school staff, and platform administrators
- Assessment reports are accessible to the assigned guardian via the secure case portal only
- Access to audio and video recordings is restricted to the assessing psychometrician and compliance officers
- All access to children's records is logged in the security audit trail

## 6. Prohibition on Secondary Use

Personal information about children collected for assessment purposes may not be:
- Used for commercial profiling, advertising, or marketing
- Shared with non-essential third parties without separate guardian consent
- Sold, licensed, or transferred to any third party
- Used to train AI models without explicit, specific guardian consent

## 7. AI Processing of Children's Information

When AI tools (DeepSeek, Groq, Gemini) process children's data:
- Student names are replaced with a case identifier before submission to AI services
- Date of birth is redacted from AI prompts
- AI-generated outputs are reviewed by a qualified psychometrician before being included in any report
- AI analysis is supplementary to, not a replacement for, professional clinical judgment

## 8. Cross-Border Transfers

Children's personal information may be transferred outside mainland China to AI service providers (USA). These transfers are subject to:
- Guardian notification and, where required, separate consent
- Standard contractual clauses with receiving vendors
- Annual review of transfer necessity and adequacy

## 9. Retention and Deletion

- Assessment records for children are retained for 7 years after case closure.
- Audio and video recordings are retained for 1 year after case closure, then securely deleted.
- On request from a guardian, records may be deleted earlier unless retention is required by law or for dispute resolution.
- Upon reaching the retention limit, all personal information is securely and irreversibly deleted.

## 10. Guardian Rights

Guardians have the right to:
- Access all personal information held about their child
- Correct inaccurate information
- Request deletion of their child's information
- Withdraw consent for AI processing or recording
- Receive a copy of their child's assessment report
- Object to or restrict specific processing activities

Requests should be directed to privacy@remynd.com or via the Privacy Rights Request Procedure.

## 11. Staff Training and Accountability

All staff who access children's personal information must:
- Complete annual training on children's data protection
- Sign the Staff Confidentiality Agreement
- Report any suspected misuse or data incident to the Compliance Officer immediately

## 12. Policy Review

This policy is reviewed annually and whenever there is a material change to our processing activities, applicable law, or AI services used.`,

    content_zh: `# 儿童个人信息保护政策

**生效日期：** [经法律审批后确认]
**版本：** 1.0（草稿）
**文件责任人：** 合规官

---

## 1. 目的和范围

本政策依据《儿童个人信息网络保护规定》、《个人信息保护法》第31条及《未成年人保护法》，规范收集、存储、使用和共享18周岁以下未成年人（对14周岁以下"低龄儿童"给予最高级别保护）个人信息的行为。

本政策适用于所有通过RAOS平台处理儿童个人信息的ReMynd人员、承包商及第三方处理者。

## 2. 定义

- **未成年人：** 18周岁以下的人员。
- **低龄儿童：** 14周岁以下的人员——适用最严格保护。
- **监护人：** 父母、法定监护人或负责儿童的授权成年人。

## 3. 同意要求

### 14周岁以下儿童
- 在收集任何个人信息之前，必须获得父母或监护人的书面可核实同意。
- 同意书必须以通俗易懂的语言说明收集哪些信息、原因、共享对象以及如何行使儿童权利。
- 同意通过评估开始前由学校管理的《家长/监护人同意书》获得。
- 对于敏感个人信息（评估结果、录音），须另行签署《敏感个人信息处理同意书》。

### 14-17周岁儿童
- 对于14-17周岁的儿童，可由儿童和监护人联合签署同意书。
- 对于敏感处理（录音、AI分析），除儿童同意外，始终需要监护人同意。

## 4. 信息最小化

我们仅收集评估目的严格必要的信息：
- 人口统计信息：姓名、出生日期、性别、年级
- 学校或监护人提供的转介信息
- 问卷答案和评估分数
- 评估会话的录音或录像（仅在获得单独录制同意的情况下）

我们不收集儿童的：家庭住址、政府身份证号码、金融信息、社交媒体资料或地理位置数据。

## 5. 存储和访问控制

儿童个人信息须额外遵守以下控制措施：
- 存储在加密的专用数据库字段中
- 仅指定的心理测量师、指定的学校工作人员和平台管理员可访问
- 评估报告仅可通过安全案例门户由指定监护人访问
- 音频和视频录制的访问权限仅限于评估心理测量师和合规官员
- 所有对儿童记录的访问均记录在安全审计追踪中

## 6. 禁止二次使用

为评估目的收集的儿童个人信息不得：
- 用于商业画像、广告或营销
- 在没有单独监护人同意的情况下与非必要第三方共享
- 出售、授权或转让给任何第三方
- 在没有明确、具体的监护人同意的情况下用于训练AI模型

## 7. AI处理儿童信息

当AI工具（DeepSeek、Groq、Gemini）处理儿童数据时：
- 提交给AI服务前，学生姓名替换为案例标识符
- AI提示词中的出生日期被编辑
- AI生成的输出在纳入任何报告之前由合格的心理测量师审查
- AI分析是对专业临床判断的补充，而非替代

## 8. 跨境传输

儿童个人信息可能被传输至中国大陆以外的AI服务提供商（美国）。这些传输须遵守：
- 监护人通知，且在必要时须获得单独同意
- 与接收供应商的标准合同条款
- 对传输必要性和充分性的年度审查

## 9. 保留和删除

- 儿童评估记录在案例结案后保留7年。
- 音频和视频录制在案例结案后保留1年，然后安全删除。
- 根据监护人的要求，除非法律要求保留或用于争议解决，否则可提前删除记录。
- 达到保留期限后，所有个人信息将被安全且不可逆地删除。

## 10. 监护人权利

监护人有权：
- 访问其子女的所有个人信息
- 更正不准确的信息
- 要求删除其子女的信息
- 撤回对AI处理或录制的同意
- 获得其子女的评估报告副本
- 反对或限制特定处理活动

请求应发送至 privacy@remynd.com 或通过《隐私权利请求程序》提交。

## 11. 员工培训和问责

所有访问儿童个人信息的工作人员必须：
- 完成年度儿童数据保护培训
- 签署《员工保密协议》
- 立即向合规官报告任何疑似滥用或数据事件

## 12. 政策审查

本政策每年审查一次，并在我们的处理活动、适用法律或使用的AI服务发生实质性变化时进行审查。`,

    content_ko: `# 아동 개인정보 보호 정책

**시행일:** [법률 승인 후 확정]
**버전:** 1.0 (초안)
**문서 담당자:** 컴플라이언스 책임자

---

## 1. 목적 및 범위

본 정책은 아동 개인정보 온라인 보호 규정(PPCP), PIPL 제31조 및 미성년자 보호법에 따라 18세 미만 아동(14세 미만 "어린 아동"에게는 강화된 보호 적용)의 개인정보 수집, 저장, 이용 및 공유를 규율합니다.

본 정책은 RAOS 플랫폼을 통해 아동 개인정보를 처리하는 모든 ReMynd 직원, 계약자 및 제3자 처리자에게 적용됩니다.

## 2. 정의

- **아동:** 18세 미만의 사람.
- **어린 아동:** 14세 미만의 사람 — 가장 엄격한 보호 적용.
- **보호자:** 부모, 법정 보호자 또는 아동을 책임지는 권한 있는 성인.

## 3. 동의 요건

### 14세 미만 아동
- 개인정보 수집 전 부모 또는 보호자의 서면 확인 가능한 동의가 필수입니다.
- 동의서는 수집되는 정보, 이유, 공유 대상 및 아동의 권리 행사 방법을 쉬운 언어로 설명해야 합니다.
- 동의는 평가 시작 전 학교를 통해 시행되는 부모/보호자 동의서를 통해 획득합니다.
- 민감한 개인정보(평가 결과, 음성 녹음)에 대해서는 별도의 민감한 개인정보 처리 동의서가 필요합니다.

### 14-17세 아동
- 14-17세 아동의 경우 아동과 보호자가 공동으로 동의서에 서명할 수 있습니다.
- 민감한 처리(녹음, AI 분석)의 경우 아동의 동의 외에 항상 보호자 동의가 필요합니다.

## 4. 정보 최소화

당사는 평가 목적에 엄격히 필요한 정보만 수집합니다:
- 인구통계 정보: 이름, 생년월일, 성별, 학년
- 학교 또는 보호자가 제공한 의뢰 정보
- 설문지 응답 및 평가 점수
- 평가 세션의 음성 또는 영상 녹화 (별도 녹화 동의 획득 시만)

당사는 아동의 가정 주소, 정부 신분증 번호, 금융 정보, 소셜 미디어 프로필 또는 위치 데이터를 수집하지 않습니다.

## 5. 저장 및 접근 통제

아동 개인정보에는 다음과 같은 추가 통제가 적용됩니다:
- 암호화된 전용 데이터베이스 필드에 저장
- 배정된 심리 측정사, 지정된 학교 직원 및 플랫폼 관리자만 접근 가능
- 평가 보고서는 안전한 사례 포털을 통해 지정된 보호자만 접근 가능
- 음성 및 영상 녹화물 접근은 평가 심리 측정사 및 컴플라이언스 담당자로 제한
- 아동 기록에 대한 모든 접근은 보안 감사 추적에 기록

## 6. 2차 이용 금지

평가 목적으로 수집된 아동 개인정보는 다음에 사용할 수 없습니다:
- 상업적 프로파일링, 광고 또는 마케팅
- 별도 보호자 동의 없이 비필수 제3자와 공유
- 제3자에게 판매, 라이선스 또는 양도
- 명시적이고 구체적인 보호자 동의 없이 AI 모델 훈련에 사용

## 7. 아동 정보의 AI 처리

AI 도구(DeepSeek, Groq, Gemini)가 아동 데이터를 처리할 때:
- AI 서비스에 제출하기 전 학생 이름을 사례 식별자로 교체
- AI 프롬프트에서 생년월일 삭제
- AI 생성 결과물은 자격 있는 심리 측정사가 검토 후 보고서에 포함
- AI 분석은 전문적 임상 판단의 대체가 아닌 보조 수단

## 8. 국경 간 이전

아동 개인정보는 AI 서비스 제공업체(미국)에 중국 본토 외부로 이전될 수 있습니다. 이러한 이전에는 다음이 적용됩니다:
- 보호자 통지, 필요 시 별도 동의
- 수신 벤더와의 표준 계약 조항
- 이전 필요성 및 적절성에 대한 연간 검토

## 9. 보유 및 삭제

- 아동 평가 기록은 사례 종료 후 7년간 보유합니다.
- 음성 및 영상 녹화물은 사례 종료 후 1년간 보유 후 안전하게 삭제합니다.
- 보호자의 요청에 따라 법률 또는 분쟁 해결에 필요한 경우를 제외하고 조기 삭제할 수 있습니다.
- 보유 기간 종료 시 모든 개인정보는 안전하고 복구 불가능하게 삭제됩니다.

## 10. 보호자의 권리

보호자는 다음 권리를 보유합니다:
- 자녀에 관한 모든 개인정보 열람
- 부정확한 정보 정정
- 자녀 정보 삭제 요청
- AI 처리 또는 녹화에 대한 동의 철회
- 자녀의 평가 보고서 사본 수령
- 특정 처리 활동에 대한 반대 또는 제한

요청은 privacy@remynd.com 또는 개인정보 권리 요청 절차를 통해 제출하십시오.

## 11. 직원 교육 및 책임

아동 개인정보에 접근하는 모든 직원은:
- 연간 아동 데이터 보호 교육 이수
- 직원 기밀 유지 계약서 서명
- 의심스러운 남용 또는 데이터 사고 발생 시 즉시 컴플라이언스 책임자에게 보고

## 12. 정책 검토

본 정책은 연간 검토되며, 처리 활동, 적용 법률 또는 사용되는 AI 서비스에 중대한 변경이 있을 때마다 검토됩니다.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 3. Parent/Guardian Consent
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Parent/Guardian Consent",
    content_en: `# Parent / Guardian Consent for Psychological Assessment

**Document Version:** 1.0 (Draft — Not for distribution)
**Purpose:** Informed consent for assessment, data processing, and report generation

---

## Introduction

Before your child's psychological assessment begins, we need your informed consent. This document explains what the assessment involves, how we will use and protect your child's information, and your rights as a parent or guardian.

**Please read this carefully before signing.**

---

## 1. What the Assessment Involves

Your child has been referred for a psychological assessment by their school. The assessment may include:

- **Questionnaires:** You, your child, and/or teachers may be asked to complete standardised rating scales or questionnaires about your child's behaviour, attention, memory, emotional wellbeing, and/or other areas of development.
- **Structured Interviews:** The assessor may conduct a structured interview with you and/or your child.
- **Record Review:** We may review relevant school reports and academic records provided by the school.
- **Audio/Video Recording:** With separate consent (see below), sessions may be audio or video recorded for clinical documentation purposes.

The assessment will be conducted by a qualified psychometrician. Results will be compiled into a written assessment report.

## 2. How We Use Your Child's Information

We will use the information collected to:
- Conduct and score the psychological assessment
- Generate an assessment report for the school and for you
- Assist with AI-generated analysis (see Section 4 below)
- Maintain clinical records as required by professional and legal standards

## 3. Who Sees Your Child's Information

| Recipient | Purpose |
|-----------|---------|
| Assigned psychometrician | Conducting and reporting the assessment |
| Designated school staff | Receiving and acting on the report |
| You (parent/guardian) | Receiving the report and records |
| AI processing services (DeepSeek, Gemini) | Generating analysis — your child is identified only by a case ID, not name |
| Platform administrators | Technical support and compliance |

We do not share your child's personal information with advertising companies, other schools, government bodies (except where legally required), or the general public.

## 4. AI-Assisted Analysis

ReMynd uses AI tools to help psychometricians analyse questionnaire data and draft report sections. Please be aware:
- Your child's **name is replaced with an anonymous case number** before data is sent to any AI service.
- Your child's **date of birth is removed** from AI prompts.
- All AI-generated content is **reviewed and approved by a qualified psychometrician** before it is included in any report.
- AI analysis is intended to assist, not replace, professional clinical judgment.

*By signing this consent, you agree to this use of AI-assisted analysis. If you do not consent to AI analysis, please indicate below and speak with the psychometrician.*

☐ I **do not** consent to AI-assisted analysis of my child's information.

## 5. Cross-Border Data Transfer

Some AI services used by ReMynd process data in the United States. When your child's anonymised case data is processed by these services, it is transferred outside mainland China. We have contractual safeguards in place with these providers.

*By signing, you acknowledge this transfer. If you have questions, please contact privacy@remynd.com.*

## 6. Recording Consent (Separate)

Audio or video recording of assessment sessions requires a **separate Recording Consent form**. If recording is proposed, you will receive that form in addition to this one.

## 7. Data Retention

Your child's assessment records will be retained for **7 years** after the case is closed, in accordance with professional standards. Audio/video recordings (if any) are deleted after **1 year**.

## 8. Your Rights

As a parent or guardian, you have the right to:
- Access a copy of your child's assessment records
- Correct any inaccurate information
- Request deletion of records (subject to legal retention obligations)
- Withdraw your consent at any time — this will not affect records already created
- Receive a copy of the assessment report
- Ask questions about the assessment at any time

Contact: **privacy@remynd.com**

## 9. Voluntary Participation

Participation in this assessment is voluntary. However, if you decline consent, the school may not be able to access ReMynd's assessment services for your child.

---

## Guardian Declaration

I, the undersigned parent/guardian of ______________________ (child's name), confirm that:

☐ I have read and understood this consent form.
☐ I have had the opportunity to ask questions.
☐ I consent to the collection, use, and processing of my child's personal information as described above.
☐ I consent to the cross-border transfer of anonymised case data to AI service providers.
☐ I understand my rights and know how to contact ReMynd if I wish to exercise them.

**Signature:** _______________________
**Name:** _______________________
**Relationship to child:** _______________________
**Date:** _______________________`,

    content_zh: `# 心理评估家长/监护人同意书

**文件版本：** 1.0（草稿——不得分发）
**目的：** 评估、数据处理和报告生成的知情同意

---

## 简介

在您孩子的心理评估开始之前，我们需要您的知情同意。本文件说明评估内容、我们将如何使用和保护您孩子的信息以及您作为家长或监护人的权利。

**请在签署前仔细阅读。**

---

## 1. 评估内容

您的孩子已由学校转介接受心理评估。评估可能包括：

- **问卷：** 您、您的孩子和/或教师可能被要求完成有关孩子行为、注意力、记忆力、情绪健康和/或其他发展领域的标准化评级量表或问卷。
- **结构化访谈：** 评估者可能与您和/或您的孩子进行结构化访谈。
- **记录审查：** 我们可能审查学校提供的相关学校报告和学业记录。
- **录音/录像：** 经单独同意（见下文），出于临床记录目的，会话可能被录音或录像。

评估将由合格的心理测量师进行。结果将汇编成书面评估报告。

## 2. 我们如何使用您孩子的信息

我们将使用收集的信息：
- 进行心理评估并评分
- 为学校和您生成评估报告
- 协助AI生成分析（见下文第4节）
- 按照专业和法律标准维护临床记录

## 3. 谁可以查看您孩子的信息

| 接收方 | 目的 |
|--------|------|
| 指定心理测量师 | 进行并报告评估 |
| 指定学校工作人员 | 接收并根据报告采取行动 |
| 您（家长/监护人） | 接收报告和记录 |
| AI处理服务（DeepSeek、Gemini） | 生成分析——您的孩子仅由案例ID标识，而非姓名 |
| 平台管理员 | 技术支持和合规 |

我们不与广告公司、其他学校、政府机构（法律要求除外）或公众共享您孩子的个人信息。

## 4. AI辅助分析

ReMynd使用AI工具帮助心理测量师分析问卷数据并起草报告部分。请注意：
- 在将数据发送到任何AI服务之前，您孩子的**姓名将替换为匿名案例编号**。
- 您孩子的**出生日期将从AI提示词中删除**。
- 所有AI生成的内容在纳入任何报告之前均由**合格的心理测量师审查和批准**。
- AI分析旨在辅助而非取代专业临床判断。

*签署本同意书即表示您同意使用AI辅助分析。如果您不同意AI分析，请在下方注明并与心理测量师沟通。*

☐ 我**不**同意对我孩子的信息进行AI辅助分析。

## 5. 跨境数据传输

ReMynd使用的部分AI服务在美国处理数据。当您孩子的匿名案例数据由这些服务处理时，将被传输至中国大陆以外。我们与这些提供商签有合同保障措施。

*签署即表示您知悉此类传输。如有疑问，请联系 privacy@remynd.com。*

## 6. 录制同意（单独）

评估会话的录音或录像需要**单独的录制同意书**。如果提议录制，您将收到该表格作为本同意书的补充。

## 7. 数据保留

您孩子的评估记录将在案例结案后按照专业标准保留**7年**。录音/录像（如有）在**1年**后删除。

## 8. 您的权利

作为家长或监护人，您有权：
- 访问您孩子评估记录的副本
- 更正任何不准确的信息
- 要求删除记录（受法定保留义务约束）
- 随时撤回同意——这不会影响已经创建的记录
- 获得评估报告的副本
- 随时就评估提问

联系方式：**privacy@remynd.com**

## 9. 自愿参与

参与本评估是自愿的。但是，如果您拒绝同意，学校可能无法为您的孩子获取ReMynd的评估服务。

---

## 监护人声明

本人，______________________ （孩子姓名）的家长/监护人，确认：

☐ 本人已阅读并理解本同意书。
☐ 本人有机会提问。
☐ 本人同意按照上述说明收集、使用和处理我孩子的个人信息。
☐ 本人同意将匿名案例数据跨境传输给AI服务提供商。
☐ 本人了解自己的权利，并知道如何联系ReMynd以行使这些权利。

**签名：** _______________________
**姓名：** _______________________
**与孩子的关系：** _______________________
**日期：** _______________________`,

    content_ko: `# 심리 평가 부모/보호자 동의서

**문서 버전:** 1.0 (초안 — 배포 금지)
**목적:** 평가, 데이터 처리 및 보고서 생성에 대한 고지된 동의

---

## 소개

자녀의 심리 평가가 시작되기 전에 귀하의 고지된 동의가 필요합니다. 본 문서는 평가 내용, 자녀의 정보를 사용하고 보호하는 방법 및 부모 또는 보호자로서의 귀하의 권리를 설명합니다.

**서명하기 전에 주의 깊게 읽어 주십시오.**

---

## 1. 평가 내용

귀하의 자녀는 학교로부터 심리 평가에 의뢰되었습니다. 평가에는 다음이 포함될 수 있습니다:

- **설문지:** 귀하, 자녀 및/또는 교사가 자녀의 행동, 주의력, 기억력, 정서적 웰빙 및/또는 기타 발달 영역에 관한 표준화된 평가 척도 또는 설문지를 작성하도록 요청받을 수 있습니다.
- **구조화된 면담:** 평가자가 귀하 및/또는 자녀와 구조화된 면담을 실시할 수 있습니다.
- **기록 검토:** 학교가 제공한 관련 학교 보고서 및 학업 기록을 검토할 수 있습니다.
- **음성/영상 녹화:** 별도 동의(하단 참조)를 통해 임상 기록 목적으로 세션이 음성 또는 영상 녹화될 수 있습니다.

평가는 자격 있는 심리 측정사가 수행합니다. 결과는 서면 평가 보고서로 작성됩니다.

## 2. 자녀 정보 이용 방법

수집된 정보는 다음 목적으로 이용됩니다:
- 심리 평가 실시 및 채점
- 학교와 귀하를 위한 평가 보고서 생성
- AI 생성 분석 지원 (아래 4절 참조)
- 전문적 및 법적 기준에 따른 임상 기록 유지

## 3. 자녀 정보 열람 대상

| 수신자 | 목적 |
|--------|------|
| 담당 심리 측정사 | 평가 실시 및 보고 |
| 지정된 학교 직원 | 보고서 수령 및 조치 |
| 귀하 (부모/보호자) | 보고서 및 기록 수령 |
| AI 처리 서비스 (DeepSeek, Gemini) | 분석 생성 — 자녀는 이름이 아닌 사례 ID로만 식별 |
| 플랫폼 관리자 | 기술 지원 및 컴플라이언스 |

당사는 광고 회사, 다른 학교, 정부 기관(법적으로 요구되는 경우 제외) 또는 일반 대중과 자녀의 개인정보를 공유하지 않습니다.

## 4. AI 보조 분석

ReMynd는 AI 도구를 사용하여 심리 측정사가 설문지 데이터를 분석하고 보고서 섹션을 작성하는 것을 지원합니다. 주의 사항:
- AI 서비스에 데이터를 전송하기 전에 자녀의 **이름이 익명 사례 번호로 교체**됩니다.
- AI 프롬프트에서 자녀의 **생년월일이 삭제**됩니다.
- 모든 AI 생성 내용은 보고서에 포함되기 전에 **자격 있는 심리 측정사가 검토하고 승인**합니다.
- AI 분석은 전문적 임상 판단을 대체하는 것이 아니라 보조하기 위한 것입니다.

*본 동의서에 서명함으로써 AI 보조 분석 이용에 동의합니다. AI 분석에 동의하지 않는 경우 아래에 표시하고 심리 측정사와 상담하십시오.*

☐ 자녀의 정보에 대한 AI 보조 분석에 **동의하지 않습니다**.

## 5. 국경 간 데이터 이전

ReMynd가 사용하는 일부 AI 서비스는 미국에서 데이터를 처리합니다. 자녀의 익명화된 사례 데이터가 이러한 서비스에서 처리될 때 중국 본토 밖으로 이전됩니다. 당사는 이러한 제공업체와 계약적 보호 조치를 마련하고 있습니다.

*서명함으로써 이러한 이전을 인지합니다. 질문이 있으시면 privacy@remynd.com으로 연락하십시오.*

## 6. 녹화 동의 (별도)

평가 세션의 음성 또는 영상 녹화에는 **별도의 녹화 동의서**가 필요합니다. 녹화가 제안되면 본 동의서와 함께 해당 양식을 받으시게 됩니다.

## 7. 데이터 보유

자녀의 평가 기록은 전문 기준에 따라 사례 종료 후 **7년간** 보유됩니다. 음성/영상 녹화물(있는 경우)은 **1년** 후 삭제됩니다.

## 8. 귀하의 권리

부모 또는 보호자로서 귀하는 다음 권리를 보유합니다:
- 자녀의 평가 기록 사본 열람
- 부정확한 정보 정정
- 기록 삭제 요청 (법정 보유 의무 적용)
- 언제든지 동의 철회 — 이미 생성된 기록에는 영향 없음
- 평가 보고서 사본 수령
- 언제든지 평가에 관한 질문

연락처: **privacy@remynd.com**

## 9. 자발적 참여

본 평가 참여는 자발적입니다. 그러나 동의를 거부하면 학교에서 자녀를 위한 ReMynd의 평가 서비스에 접근하지 못할 수 있습니다.

---

## 보호자 선언

본인, ______________________ (자녀 이름)의 부모/보호자는 다음을 확인합니다:

☐ 본 동의서를 읽고 이해했습니다.
☐ 질문할 기회가 있었습니다.
☐ 위에 설명된 대로 자녀의 개인정보 수집, 이용 및 처리에 동의합니다.
☐ 익명화된 사례 데이터를 AI 서비스 제공업체에 국경 간 이전하는 것에 동의합니다.
☐ 내 권리를 이해하고 이를 행사하고자 할 때 ReMynd에 연락하는 방법을 알고 있습니다.

**서명:** _______________________
**이름:** _______________________
**자녀와의 관계:** _______________________
**날짜:** _______________________`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 4. Sensitive Personal Information Consent
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Sensitive Personal Information Consent",
    content_en: `# Sensitive Personal Information Processing Consent

**Document Version:** 1.0 (Draft)

---

## Notice

This form is required in addition to the Parent/Guardian Consent form. It addresses the processing of sensitive personal information (SPI) as defined under the Personal Information Protection Law of the People's Republic of China (PIPL, Article 28).

Sensitive personal information requires separate, explicit consent and may not be processed without it.

## What Counts as Sensitive Personal Information

The following categories of SPI are processed through ReMynd's assessment platform:

| Category | Specific Information |
|----------|---------------------|
| Health / psychological information | Assessment questionnaire responses, standardised test scores, clinical observations, diagnostic impressions |
| Biometric-adjacent information | Audio recordings of assessment sessions |
| Information about minors | All information about children under 14 |

## Purpose of Processing

Sensitive personal information is processed for the following specific purposes:
1. **Assessment scoring and analysis:** Questionnaire responses are scored against standardised normative data to identify areas of strength and difficulty.
2. **Clinical report generation:** Scores and observations are compiled into a written psychological assessment report.
3. **AI-assisted analysis:** Anonymised assessment data is submitted to AI services (student name replaced by case ID; date of birth removed) to assist in drafting interpretive report sections.
4. **Clinical recordkeeping:** Records are maintained to support follow-up, to meet professional obligations, and to provide to authorised recipients.

## Who Processes This Information

- **ReMynd's qualified psychometricians** — primary processors
- **AI services (DeepSeek, Gemini)** — anonymised data only; no name, no DOB
- **Platform administrators** — for technical support and compliance audits only

## Storage and Protection

SPI is:
- Stored encrypted at rest using AES-256 or equivalent
- Accessible only to personnel with an explicit access role
- Transmitted only over encrypted (TLS 1.2+) channels
- Subject to audit logging for every access event

## Withdrawal of Consent

You may withdraw your consent for SPI processing at any time by contacting privacy@remynd.com. Withdrawal of consent:
- Takes effect from the date of withdrawal
- Does not affect the lawfulness of processing carried out before withdrawal
- May limit the ability to complete the assessment or issue a report

---

## Consent Declaration

I, the undersigned, confirm that I have been informed about the nature of the sensitive personal information that will be processed, the purpose of processing, the identity of processors, and my right to withdraw consent.

☐ I **consent** to the processing of sensitive personal information about ______________________ (child's name / self) as described above.

☐ I specifically **consent** to the use of anonymised data in AI-assisted analysis.

**Signature:** _______________________
**Name:** _______________________
**Capacity (parent/guardian/self):** _______________________
**Date:** _______________________`,

    content_zh: `# 敏感个人信息处理同意书

**文件版本：** 1.0（草稿）

---

## 通知

本表格须与《家长/监护人同意书》一并填写。它涉及根据《中华人民共和国个人信息保护法》（个保法第28条）定义的敏感个人信息（SPI）的处理。

敏感个人信息需要单独的明示同意，未经同意不得处理。

## 什么构成敏感个人信息

以下类别的敏感个人信息通过ReMynd评估平台处理：

| 类别 | 具体信息 |
|------|---------|
| 健康/心理信息 | 评估问卷答案、标准化测试分数、临床观察、诊断印象 |
| 类生物特征信息 | 评估会话录音 |
| 未成年人信息 | 14周岁以下儿童的所有信息 |

## 处理目的

敏感个人信息因以下特定目的而被处理：
1. **评估评分和分析：** 问卷答案根据标准常模数据进行评分，以识别优势和困难领域。
2. **临床报告生成：** 分数和观察结果汇编成书面心理评估报告。
3. **AI辅助分析：** 匿名评估数据提交给AI服务（学生姓名替换为案例ID；出生日期删除），以协助起草解释性报告部分。
4. **临床记录保存：** 记录的维护用于支持后续跟进、履行专业义务并提供给授权接收方。

## 谁处理这些信息

- **ReMynd的合格心理测量师** — 主要处理者
- **AI服务（DeepSeek、Gemini）** — 仅处理匿名数据；无姓名、无出生日期
- **平台管理员** — 仅用于技术支持和合规审计

## 存储和保护

敏感个人信息：
- 使用AES-256或同等标准加密存储
- 仅具有明确访问角色的人员可访问
- 仅通过加密（TLS 1.2+）通道传输
- 每次访问事件均有审计日志记录

## 撤回同意

您可以随时通过联系 privacy@remynd.com 撤回对敏感个人信息处理的同意。撤回同意：
- 自撤回之日起生效
- 不影响撤回前进行的处理的合法性
- 可能限制完成评估或出具报告的能力

---

## 同意声明

本人，签署方，确认已被告知将处理的敏感个人信息的性质、处理目的、处理者身份以及本人的撤回同意权。

☐ 本人**同意**按照上述说明处理______________________ （孩子姓名/本人）的敏感个人信息。

☐ 本人特别**同意**在AI辅助分析中使用匿名数据。

**签名：** _______________________
**姓名：** _______________________
**身份（家长/监护人/本人）：** _______________________
**日期：** _______________________`,

    content_ko: `# 민감한 개인정보 처리 동의서

**문서 버전:** 1.0 (초안)

---

## 고지

본 양식은 부모/보호자 동의서와 함께 필요합니다. 중국 개인정보보호법(PIPL 제28조)에 정의된 민감한 개인정보(SPI) 처리를 다룹니다.

민감한 개인정보는 별도의 명시적 동의가 필요하며, 동의 없이 처리할 수 없습니다.

## 민감한 개인정보 범위

다음 범주의 SPI가 ReMynd 평가 플랫폼을 통해 처리됩니다:

| 범주 | 구체적 정보 |
|------|------------|
| 건강/심리 정보 | 평가 설문지 응답, 표준화 검사 점수, 임상 관찰, 진단적 인상 |
| 생체정보 유사 정보 | 평가 세션 음성 녹음 |
| 미성년자 정보 | 14세 미만 아동에 관한 모든 정보 |

## 처리 목적

민감한 개인정보는 다음 특정 목적으로 처리됩니다:
1. **평가 채점 및 분석:** 설문지 응답을 표준화된 규준 데이터와 비교하여 강점 및 어려움 영역을 파악합니다.
2. **임상 보고서 생성:** 점수와 관찰 내용을 서면 심리 평가 보고서로 작성합니다.
3. **AI 보조 분석:** 익명화된 평가 데이터를 AI 서비스에 제출(학생 이름을 사례 ID로 교체, 생년월일 삭제)하여 해석적 보고서 섹션 작성을 지원합니다.
4. **임상 기록 유지:** 후속 지원, 전문적 의무 이행 및 권한 있는 수신자 제공을 위해 기록이 유지됩니다.

## 정보 처리 주체

- **ReMynd의 자격 있는 심리 측정사** — 주요 처리자
- **AI 서비스 (DeepSeek, Gemini)** — 익명화된 데이터만; 이름, 생년월일 없음
- **플랫폼 관리자** — 기술 지원 및 컴플라이언스 감사에만 해당

## 저장 및 보호

SPI는:
- AES-256 또는 동급 암호화로 저장
- 명시적 접근 역할을 가진 직원만 접근 가능
- 암호화된(TLS 1.2+) 채널을 통해서만 전송
- 모든 접근 이벤트에 대한 감사 로그 적용

## 동의 철회

privacy@remynd.com에 연락하여 언제든지 SPI 처리에 대한 동의를 철회할 수 있습니다. 동의 철회:
- 철회일부터 효력 발생
- 철회 전 수행된 처리의 합법성에 영향 없음
- 평가 완료 또는 보고서 발행 능력을 제한할 수 있음

---

## 동의 선언

본인, 서명자는 처리될 민감한 개인정보의 성격, 처리 목적, 처리자 신원 및 동의 철회 권리에 대해 고지받았음을 확인합니다.

☐ 위에 설명된 대로 ______________________ (자녀 이름/본인)의 민감한 개인정보 처리에 **동의합니다**.

☐ AI 보조 분석에서 익명화된 데이터 사용에 특별히 **동의합니다**.

**서명:** _______________________
**이름:** _______________________
**자격 (부모/보호자/본인):** _______________________
**날짜:** _______________________`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 5. Recording Consent
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Recording Consent",
    content_en: `# Audio / Video Recording Consent

**Document Version:** 1.0 (Draft)

---

## Purpose

This form obtains your explicit consent for audio and/or video recording of psychological assessment sessions, as required under PIPL for sensitive personal information processing.

Recording is **never mandatory**. Assessment can proceed fully without recording.

## Why We Record

Recordings may be made for:
- Clinical documentation of the assessment session
- Quality assurance and professional supervision
- Supporting a psychometrician's written observations in the report
- Resolving any disputes about assessment conduct

## How Recordings Are Stored

- Stored in encrypted object storage accessible only to the assessing psychometrician and compliance officers
- Never shared with third parties, schools, parents, or AI services
- Retention period: **1 year** after case closure, then permanently deleted
- Access is logged in the security audit trail

## Your Rights

- You may withdraw this consent at any time before or during the assessment session.
- You may request deletion of recordings at any time.
- Withdrawing recording consent does not affect the rest of the assessment.

---

## Consent Declaration

I consent to audio ☐ / video ☐ / both ☐ recording of the assessment session(s) for ______________________ (child's name / self), subject to the storage and deletion terms described above.

**Signature:** _______________________
**Name:** _______________________
**Date:** _______________________`,

    content_zh: `# 录音/录像同意书

**文件版本：** 1.0（草稿）

---

## 目的

本表格根据个保法关于敏感个人信息处理的要求，获取您对心理评估会话进行录音和/或录像的明示同意。

录制**从不强制**。评估可以完全在不录制的情况下进行。

## 我们为何录制

录制可能出于以下目的：
- 评估会话的临床记录
- 质量保证和专业督导
- 支持心理测量师在报告中的书面观察
- 解决有关评估行为的任何争议

## 录制内容的存储方式

- 存储在加密对象存储中，仅评估心理测量师和合规官员可访问
- 绝不与第三方、学校、家长或AI服务共享
- 保留期限：案例结案后**1年**，然后永久删除
- 访问记录在安全审计追踪中

## 您的权利

- 您可以在评估会话之前或期间随时撤回本同意。
- 您可以随时要求删除录制内容。
- 撤回录制同意不影响评估的其余部分。

---

## 同意声明

本人同意对______________________ （孩子姓名/本人）的评估会话进行录音 ☐ / 录像 ☐ / 两者 ☐，受上述存储和删除条款约束。

**签名：** _______________________
**姓名：** _______________________
**日期：** _______________________`,

    content_ko: `# 음성/영상 녹화 동의서

**문서 버전:** 1.0 (초안)

---

## 목적

본 양식은 민감한 개인정보 처리에 관한 PIPL 요건에 따라 심리 평가 세션의 음성 및/또는 영상 녹화에 대한 명시적 동의를 받습니다.

녹화는 **절대 의무가 아닙니다**. 평가는 녹화 없이도 완전히 진행될 수 있습니다.

## 녹화 목적

녹화는 다음 목적으로 이루어질 수 있습니다:
- 평가 세션의 임상 기록
- 품질 보증 및 전문적 감독
- 보고서에서 심리 측정사의 서면 관찰 지원
- 평가 수행에 관한 분쟁 해결

## 녹화물 저장 방법

- 담당 심리 측정사 및 컴플라이언스 담당자만 접근할 수 있는 암호화된 객체 스토리지에 저장
- 제3자, 학교, 부모 또는 AI 서비스와 절대 공유하지 않음
- 보유 기간: 사례 종료 후 **1년**, 이후 영구 삭제
- 접근 내역은 보안 감사 추적에 기록

## 귀하의 권리

- 평가 세션 전 또는 진행 중 언제든지 본 동의를 철회할 수 있습니다.
- 언제든지 녹화물 삭제를 요청할 수 있습니다.
- 녹화 동의 철회는 평가의 나머지 부분에 영향을 미치지 않습니다.

---

## 동의 선언

위에 설명된 저장 및 삭제 조건에 따라 ______________________ (자녀 이름/본인)의 평가 세션에 대한 음성 ☐ / 영상 ☐ / 둘 다 ☐ 녹화에 동의합니다.

**서명:** _______________________
**이름:** _______________________
**날짜:** _______________________`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 6. School–ReMynd Data Processing Agreement
  // ─────────────────────────────────────────────────────────────────
  {
    name: "School–ReMynd Data Processing Agreement",
    content_en: `# School – ReMynd Data Processing Agreement

**Document Version:** 1.0 (Draft — Requires Legal Review)

---

## Parties

**Data Controller:** [School Name] ("the School")
**Data Processor:** ReMynd Technology ("ReMynd")

---

## 1. Background

The School has engaged ReMynd to provide psychological assessment services through the RAOS platform. In doing so, ReMynd will process personal information on behalf of the School. This Agreement governs that processing in accordance with PIPL and applicable data protection laws.

## 2. Subject Matter and Duration

ReMynd shall process personal information for the purpose of delivering psychological assessment services as specified in the Service Agreement between the parties. Processing shall continue for the duration of the Service Agreement and for the post-termination retention period specified in this Agreement.

## 3. Nature and Purpose of Processing

| Nature | Details |
|--------|---------|
| Types of data | Student identity, assessment responses, scores, clinical observations, audio/video recordings (with separate consent), parent/guardian contact details |
| Data subjects | Students, parents/guardians, school staff |
| Purpose | Psychological assessment, scoring, reporting, case management |
| Duration | Duration of the Service Agreement + 7 years post-closure per case |

## 4. Obligations of ReMynd (Processor)

ReMynd shall:

a) Process personal information only on the documented instructions of the School.
b) Ensure that personnel authorised to process personal information are bound by confidentiality obligations.
c) Implement and maintain appropriate technical and organisational security measures (see Information Security Policy).
d) Obtain the School's prior written consent before engaging sub-processors.
e) Assist the School in fulfilling its obligations with respect to data subject rights requests.
f) At the School's request, delete or return all personal information and delete existing copies at the end of the processing relationship.
g) Provide the School with all information necessary to demonstrate compliance with this Agreement.
h) Notify the School without undue delay upon becoming aware of a personal data breach.

## 5. Obligations of the School (Controller)

The School shall:

a) Ensure that it has a lawful basis for instructing ReMynd to process personal information.
b) Ensure that appropriate consents have been obtained from parents, guardians, and where relevant, students, before providing personal information to ReMynd.
c) Respond to data subject rights requests in a timely manner.
d) Notify ReMynd promptly of any changes to processing instructions.

## 6. Sub-Processors

ReMynd currently uses the following approved sub-processors:

| Sub-Processor | Purpose | Location |
|---------------|---------|---------|
| DeepSeek | AI assessment analysis | China (PRC) |
| Google Gemini | AI vision analysis | USA |
| Groq | Audio transcription (Whisper) | USA |
| Airwallex | Payment processing | Multi-region |
| Google Docs API | Report PDF generation | USA |
| Replit Object Storage | File storage | USA/Singapore |

The School consents to the use of these sub-processors by signing this Agreement. ReMynd shall notify the School of any intended changes to the list of sub-processors and provide an opportunity to object.

## 7. Cross-Border Transfers

Personal information may be transferred outside mainland China to sub-processors listed above. ReMynd shall implement standard contractual clauses or equivalent safeguards for all cross-border transfers.

## 8. Security Incidents

ReMynd shall notify the School within **72 hours** of becoming aware of a security incident affecting school data. The notification shall include the nature of the incident, the data affected, and the steps taken to mitigate it.

## 9. Termination and Data Deletion

Upon termination of this Agreement:
- ReMynd shall return or securely delete all personal information within 30 days, unless longer retention is required by law.
- Assessment records shall be retained for 7 years post-closure per case (or as agreed in the Service Agreement), after which they shall be permanently deleted.

## 10. Governing Law

This Agreement is governed by the laws of the People's Republic of China.

---

*[Signature blocks for School representative and ReMynd representative — to be finalised with legal counsel]*`,

    content_zh: `# 学校—ReMynd数据处理协议

**文件版本：** 1.0（草稿——需法律审查）

---

## 各方

**数据控制者：** [学校名称]（"学校"）
**数据处理者：** ReMynd科技（"ReMynd"）

---

## 1. 背景

学校已委托ReMynd通过RAOS平台提供心理评估服务。在此过程中，ReMynd将代表学校处理个人信息。本协议依据个保法及适用的数据保护法律规范该处理活动。

## 2. 主题事项和期限

ReMynd应按照双方之间的服务协议规定，为提供心理评估服务的目的处理个人信息。处理应持续至服务协议期限届满及本协议规定的终止后保留期。

## 3. 处理的性质和目的

| 性质 | 详情 |
|------|------|
| 数据类型 | 学生身份、评估答案、分数、临床观察、录音/录像（经单独同意）、家长/监护人联系信息 |
| 数据主体 | 学生、家长/监护人、学校工作人员 |
| 目的 | 心理评估、评分、报告、案例管理 |
| 期限 | 服务协议期限 + 每个案例结案后7年 |

## 4. ReMynd（处理者）的义务

ReMynd应：

a) 仅按照学校的书面指示处理个人信息。
b) 确保被授权处理个人信息的人员受保密义务约束。
c) 实施并维护适当的技术和组织安全措施（见《信息安全政策》）。
d) 在聘用次级处理者之前获得学校的事先书面同意。
e) 协助学校履行有关数据主体权利请求的义务。
f) 根据学校的要求，在处理关系终止时删除或归还所有个人信息并删除现有副本。
g) 向学校提供所有必要的信息，以证明遵守本协议。
h) 在知悉个人数据泄露后立即通知学校。

## 5. 学校（控制者）的义务

学校应：

a) 确保有合法依据指示ReMynd处理个人信息。
b) 确保在向ReMynd提供个人信息之前已从家长、监护人和（如相关）学生处获得适当同意。
c) 及时响应数据主体权利请求。
d) 及时通知ReMynd处理指示的任何变更。

## 6. 次级处理者

ReMynd目前使用以下已批准的次级处理者：

| 次级处理者 | 目的 | 所在地 |
|-----------|------|-------|
| DeepSeek | AI评估分析 | 中国（中华人民共和国） |
| Google Gemini | AI视觉分析 | 美国 |
| Groq | 音频转录（Whisper） | 美国 |
| Airwallex | 支付处理 | 多地区 |
| Google Docs API | 报告PDF生成 | 美国 |
| Replit Object Storage | 文件存储 | 美国/新加坡 |

学校通过签署本协议同意使用这些次级处理者。ReMynd应将次级处理者名单的任何预期变更通知学校，并提供反对机会。

## 7. 跨境传输

个人信息可能传输至上列次级处理者所在的中国大陆以外地区。ReMynd应为所有跨境传输实施标准合同条款或同等保障措施。

## 8. 安全事件

ReMynd应在知悉影响学校数据的安全事件后**72小时**内通知学校。通知应包括事件性质、受影响数据及采取的缓解措施。

## 9. 终止和数据删除

本协议终止后：
- ReMynd应在30天内归还或安全删除所有个人信息，除非法律要求更长时间保留。
- 评估记录应在每个案例结案后保留7年（或按服务协议约定），此后永久删除。

## 10. 适用法律

本协议受中华人民共和国法律管辖。

---

*[学校代表和ReMynd代表的签名栏——待与法律顾问确认]*`,

    content_ko: `# 학교–ReMynd 데이터 처리 계약

**문서 버전:** 1.0 (초안 — 법률 검토 필요)

---

## 당사자

**데이터 통제자:** [학교명] ("학교")
**데이터 처리자:** ReMynd Technology ("ReMynd")

---

## 1. 배경

학교는 RAOS 플랫폼을 통해 심리 평가 서비스를 제공하기 위해 ReMynd를 고용했습니다. 이 과정에서 ReMynd는 학교를 대신하여 개인정보를 처리합니다. 본 계약은 PIPL 및 적용 가능한 데이터 보호법에 따라 해당 처리를 규율합니다.

## 2. 주제 및 기간

ReMynd는 당사자 간 서비스 계약에 명시된 대로 심리 평가 서비스를 제공하기 위한 목적으로 개인정보를 처리합니다. 처리는 서비스 계약 기간 및 본 계약에 명시된 계약 종료 후 보유 기간 동안 계속됩니다.

## 3. 처리의 성격 및 목적

| 성격 | 세부 사항 |
|------|----------|
| 데이터 유형 | 학생 신원, 평가 응답, 점수, 임상 관찰, 음성/영상 녹화(별도 동의), 부모/보호자 연락처 |
| 데이터 주체 | 학생, 부모/보호자, 학교 직원 |
| 목적 | 심리 평가, 채점, 보고, 사례 관리 |
| 기간 | 서비스 계약 기간 + 각 사례 종료 후 7년 |

## 4. ReMynd(처리자)의 의무

ReMynd는 다음을 이행해야 합니다:

a) 학교의 서면 지시에 따라서만 개인정보를 처리합니다.
b) 개인정보 처리 권한을 가진 직원이 기밀 유지 의무를 지도록 합니다.
c) 적절한 기술적, 조직적 보안 조치를 구현하고 유지합니다 (정보 보안 정책 참조).
d) 하위 처리자를 고용하기 전에 학교의 사전 서면 동의를 받습니다.
e) 데이터 주체 권리 요청에 관한 학교의 의무 이행을 지원합니다.
f) 학교의 요청에 따라 처리 관계 종료 시 모든 개인정보를 삭제하거나 반환합니다.
g) 본 계약 준수를 증명하기 위한 모든 필요한 정보를 학교에 제공합니다.
h) 개인 데이터 침해를 인지한 즉시 학교에 통보합니다.

## 5. 학교(통제자)의 의무

학교는 다음을 이행해야 합니다:

a) ReMynd에 개인정보 처리를 지시할 적법한 근거가 있음을 확인합니다.
b) ReMynd에 개인정보를 제공하기 전에 부모, 보호자 및 해당되는 경우 학생으로부터 적절한 동의를 받았음을 확인합니다.
c) 데이터 주체 권리 요청에 적시에 응답합니다.
d) 처리 지시의 변경 사항을 신속히 ReMynd에 통보합니다.

## 6. 하위 처리자

ReMynd는 현재 다음 승인된 하위 처리자를 사용합니다:

| 하위 처리자 | 목적 | 소재지 |
|------------|------|-------|
| DeepSeek | AI 평가 분석 | 중국 (PRC) |
| Google Gemini | AI 비전 분석 | 미국 |
| Groq | 음성 전사 (Whisper) | 미국 |
| Airwallex | 결제 처리 | 다중 지역 |
| Google Docs API | 보고서 PDF 생성 | 미국 |
| Replit Object Storage | 파일 스토리지 | 미국/싱가포르 |

학교는 본 계약에 서명함으로써 이러한 하위 처리자 사용에 동의합니다. ReMynd는 하위 처리자 목록의 변경 예정 사항을 학교에 통보하고 이의를 제기할 기회를 제공합니다.

## 7. 국경 간 이전

개인정보는 위에 나열된 하위 처리자에게 중국 본토 외부로 이전될 수 있습니다. ReMynd는 모든 국경 간 이전에 표준 계약 조항 또는 동등한 보호 조치를 구현합니다.

## 8. 보안 사고

ReMynd는 학교 데이터에 영향을 미치는 보안 사고를 인지한 후 **72시간** 내에 학교에 통보합니다. 통보에는 사고의 성격, 영향을 받은 데이터 및 완화 조치가 포함됩니다.

## 9. 계약 종료 및 데이터 삭제

본 계약 종료 시:
- ReMynd는 법률에서 더 긴 보유를 요구하지 않는 한 30일 이내에 모든 개인정보를 반환하거나 안전하게 삭제합니다.
- 평가 기록은 각 사례 종료 후 7년간 (또는 서비스 계약에 명시된 대로) 보유된 후 영구 삭제됩니다.

## 10. 준거법

본 계약은 중화인민공화국의 법률에 따라 규율됩니다.

---

*[학교 대표 및 ReMynd 대표를 위한 서명란 — 법률 자문과 함께 확정 예정]*`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 7. Vendor Data Processing Agreement
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Vendor Data Processing Agreement",
    content_en: `# Vendor Data Processing Agreement (Template)

**Document Version:** 1.0 (Draft — Requires Legal Review)

---

## Purpose

This template governs the relationship between ReMynd Technology ("ReMynd," Controller) and each third-party vendor (Processor) who processes personal information on ReMynd's behalf. A separate executed copy must exist for each vendor listed in the Vendor Register.

## Applicable Vendors

This DPA applies to:
- DeepSeek (AI analysis)
- Groq (audio transcription)
- Google Gemini (AI vision analysis)
- Airwallex (payment processing)
- Replit / Object Storage (file storage)
- Google Docs (report generation)
- Bobby AI (student progress records — where applicable)

## Vendor Obligations

Each vendor must:

**Data Processing**
1. Process personal information only on ReMynd's documented instructions.
2. Not use ReMynd's data to train AI models without separate written consent.
3. Not sell or further share personal information with unauthorised parties.
4. Maintain processing records (Article 29 PIPL equivalent obligations).

**Security**
5. Implement appropriate technical and organisational security measures including encryption at rest and in transit.
6. Conduct regular security assessments and provide evidence on request.
7. Notify ReMynd within 72 hours of any security incident affecting ReMynd data.

**Cross-Border**
8. Comply with applicable cross-border data transfer requirements.
9. Accept standard contractual clauses or equivalent safeguards for transfers from China.

**Sub-Processing**
10. Not engage further sub-processors without ReMynd's written consent.

**Cooperation**
11. Cooperate with ReMynd to respond to data subject rights requests.
12. Provide ReMynd with all information reasonably necessary to verify compliance.
13. At ReMynd's direction, delete or return all personal information at the end of the relationship.

## Data Training Prohibition

**Vendors must not use personal information processed under this DPA to train, fine-tune, improve, or develop any AI model without explicit, separate written consent from ReMynd.** ReMynd's standard contracts require this prohibition. Confirmation of compliance with this prohibition must be obtained from each AI vendor and reviewed annually.

## Review Schedule

Each vendor DPA must be reviewed annually and upon any material change to the vendor's services or data practices.`,

    content_zh: `# 供应商数据处理协议（模板）

**文件版本：** 1.0（草稿——需法律审查）

---

## 目的

本模板规范ReMynd科技（"ReMynd"，控制者）与代表ReMynd处理个人信息的各第三方供应商（处理者）之间的关系。每个供应商名册中列出的供应商必须有单独执行的副本。

## 适用供应商

本数据处理协议适用于：
- DeepSeek（AI分析）
- Groq（音频转录）
- Google Gemini（AI视觉分析）
- Airwallex（支付处理）
- Replit/对象存储（文件存储）
- Google Docs（报告生成）
- Bobby AI（学生进度记录——如适用）

## 供应商义务

每个供应商必须：

**数据处理**
1. 仅按照ReMynd的书面指示处理个人信息。
2. 未经单独书面同意，不得使用ReMynd的数据训练AI模型。
3. 不向未授权方出售或进一步共享个人信息。
4. 维护处理记录（个保法第29条同等义务）。

**安全保障**
5. 实施适当的技术和组织安全措施，包括静态和传输加密。
6. 定期进行安全评估并按要求提供证据。
7. 在任何影响ReMynd数据的安全事件发生后72小时内通知ReMynd。

**跨境**
8. 遵守适用的跨境数据传输要求。
9. 接受标准合同条款或同等保障措施用于来自中国的传输。

**次级处理**
10. 未经ReMynd书面同意，不得聘用进一步的次级处理者。

**合作**
11. 配合ReMynd响应数据主体权利请求。
12. 向ReMynd提供合理必要的所有信息以核实合规性。
13. 按照ReMynd的指示，在关系终止时删除或归还所有个人信息。

## 数据训练禁止

**供应商不得在没有ReMynd明确单独书面同意的情况下，使用本数据处理协议下处理的个人信息来训练、微调、改进或开发任何AI模型。** ReMynd的标准合同要求此禁止条款。必须从每个AI供应商处获得对该禁止条款遵守的确认，并每年审查。

## 审查时间表

每个供应商数据处理协议必须每年审查一次，并在供应商服务或数据实践发生重大变化时进行审查。`,

    content_ko: `# 벤더 데이터 처리 계약 (템플릿)

**문서 버전:** 1.0 (초안 — 법률 검토 필요)

---

## 목적

본 템플릿은 ReMynd Technology("ReMynd", 통제자)와 ReMynd를 대신하여 개인정보를 처리하는 각 제3자 벤더(처리자) 간의 관계를 규율합니다. 벤더 등록부에 나열된 각 벤더에 대해 별도로 체결된 사본이 있어야 합니다.

## 적용 벤더

본 DPA는 다음에 적용됩니다:
- DeepSeek (AI 분석)
- Groq (음성 전사)
- Google Gemini (AI 비전 분석)
- Airwallex (결제 처리)
- Replit / Object Storage (파일 스토리지)
- Google Docs (보고서 생성)
- Bobby AI (학생 진도 기록 — 해당되는 경우)

## 벤더 의무

각 벤더는 다음을 이행해야 합니다:

**데이터 처리**
1. ReMynd의 서면 지시에 따라서만 개인정보를 처리합니다.
2. 별도 서면 동의 없이 ReMynd 데이터를 AI 모델 훈련에 사용하지 않습니다.
3. 미승인 당사자에게 개인정보를 판매하거나 추가로 공유하지 않습니다.
4. 처리 기록을 유지합니다 (PIPL 제29조 동등 의무).

**보안**
5. 저장 및 전송 시 암호화를 포함한 적절한 기술적, 조직적 보안 조치를 구현합니다.
6. 정기적인 보안 평가를 수행하고 요청 시 증거를 제공합니다.
7. ReMynd 데이터에 영향을 미치는 보안 사고 발생 후 72시간 내에 ReMynd에 통보합니다.

**국경 간 이전**
8. 적용 가능한 국경 간 데이터 이전 요건을 준수합니다.
9. 중국으로부터의 이전에 대한 표준 계약 조항 또는 동등한 보호 조치를 수용합니다.

**하위 처리**
10. ReMynd의 서면 동의 없이 추가 하위 처리자를 고용하지 않습니다.

**협력**
11. 데이터 주체 권리 요청에 응답하기 위해 ReMynd와 협력합니다.
12. 컴플라이언스 확인을 위해 합리적으로 필요한 모든 정보를 ReMynd에 제공합니다.
13. ReMynd의 지시에 따라 관계 종료 시 모든 개인정보를 삭제하거나 반환합니다.

## 데이터 훈련 금지

**벤더는 ReMynd의 명시적이고 별도의 서면 동의 없이 본 DPA에 따라 처리된 개인정보를 AI 모델 훈련, 미세 조정, 개선 또는 개발에 사용해서는 안 됩니다.** ReMynd의 표준 계약은 이 금지 조항을 요구합니다. 각 AI 벤더로부터 이 금지 조항 준수 확인을 받아야 하며 연간 검토해야 합니다.

## 검토 일정

각 벤더 DPA는 연간 검토되어야 하며, 벤더의 서비스 또는 데이터 관행에 중대한 변경이 있을 때마다 검토되어야 합니다.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 8. Cross-Border Data Transfer Notice
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Cross-Border Data Transfer Notice",
    content_en: `# Cross-Border Data Transfer Notice

**Document Version:** 1.0 (Draft)

---

## What Is This Notice?

ReMynd transfers certain personal information to service providers located outside mainland China. Under PIPL Articles 38–43, we are required to inform you of these transfers and, in certain cases, to obtain your separate consent.

## Why We Transfer Data Overseas

ReMynd uses several internationally-based AI and infrastructure providers because equivalent services with equivalent capability are not currently available solely within mainland China. We have evaluated each transfer for necessity and proportionality.

## Transfers and Recipients

| Recipient | Country | Data Transferred | Purpose | Training Use |
|-----------|---------|-----------------|---------|--------------|
| DeepSeek | China (PRC) | Anonymised assessment observations (case ID only, no student name or DOB) | AI assessment analysis | Prohibited by contract |
| Google Gemini | USA | Anonymised assessment tool images (case ID only) | AI vision analysis of assessment materials | Prohibited by contract |
| Groq (Whisper) | USA | Audio recordings (with separate recording consent) | Speech-to-text transcription | Prohibited by contract — confirmation pending |
| Airwallex | Hong Kong / Multi-region | Subscription billing information (no assessment data) | Payment processing | Not applicable |
| Google Docs API | USA | Completed report content | PDF report generation | Prohibited by contract |
| Replit Object Storage | USA / Singapore | Assessment files, audio recordings | Secure file storage | Not applicable |

## Safeguards in Place

For each cross-border transfer, ReMynd has implemented one or more of the following:
- **Contractual clauses** requiring the recipient to provide equivalent protection to PRC law
- **Data minimisation** — only anonymised, aggregated, or non-identifiable data is sent where possible
- **Prohibition on training** — all AI vendors are contractually prohibited from using ReMynd data to train models
- **Encryption** — data is encrypted in transit and at rest

## Security Assessment

Where required by law (PIPL Article 38, CAC Measures on Security Assessment), ReMynd will complete the Cyberspace Administration of China (CAC) security assessment process. This assessment is planned for completion by [date to be confirmed].

## Your Rights

You have the right to:
- Receive a copy of this notice
- Know which of your specific data is transferred overseas
- Withdraw consent for transfers where consent is the legal basis
- Object to specific transfers

Contact: privacy@remynd.com

## Annual Review

This notice is reviewed and updated annually. Transfers are reviewed for continued necessity and adequacy.`,

    content_zh: `# 跨境数据传输通知

**文件版本：** 1.0（草稿）

---

## 本通知的内容

ReMynd将某些个人信息传输至中国大陆以外的服务提供商。根据个保法第38-43条，我们须告知您这些传输情况，并在某些情况下获取您的单独同意。

## 我们为何跨境传输数据

ReMynd使用多家国际AI和基础设施提供商，原因是目前中国大陆内仅靠内部无法获得具有同等能力的等效服务。我们已对每次传输的必要性和相称性进行评估。

## 传输和接收方

| 接收方 | 国家/地区 | 传输的数据 | 目的 | 训练使用 |
|--------|---------|----------|------|---------|
| DeepSeek | 中国（中华人民共和国） | 匿名评估观察（仅案例ID，无学生姓名或出生日期） | AI评估分析 | 合同禁止 |
| Google Gemini | 美国 | 匿名评估工具图像（仅案例ID） | AI视觉分析评估材料 | 合同禁止 |
| Groq（Whisper） | 美国 | 录音（经单独录制同意） | 语音转文字转录 | 合同禁止——确认待定 |
| Airwallex | 香港/多地区 | 订阅账单信息（无评估数据） | 支付处理 | 不适用 |
| Google Docs API | 美国 | 完成的报告内容 | PDF报告生成 | 合同禁止 |
| Replit对象存储 | 美国/新加坡 | 评估文件、录音 | 安全文件存储 | 不适用 |

## 已有的保障措施

对于每次跨境传输，ReMynd实施了以下一项或多项措施：
- **合同条款**——要求接收方提供与中国法律同等的保护
- **数据最小化**——尽可能只发送匿名化、汇总或不可识别的数据
- **训练禁止**——所有AI供应商在合同中被禁止使用ReMynd数据训练模型
- **加密**——数据在传输和存储过程中均加密

## 安全评估

在法律要求时（个保法第38条、网信办《数据出境安全评估办法》），ReMynd将完成国家互联网信息办公室（网信办）的安全评估程序。该评估计划于[待确认日期]前完成。

## 您的权利

您有权：
- 获得本通知副本
- 了解您的哪些具体数据被传输至境外
- 撤回以同意为法律依据的传输同意
- 反对特定传输

联系方式：privacy@remynd.com

## 年度审查

本通知每年审查和更新。对传输的持续必要性和充分性进行年度审查。`,

    content_ko: `# 국경 간 데이터 이전 고지

**문서 버전:** 1.0 (초안)

---

## 본 고지의 내용

ReMynd는 특정 개인정보를 중국 본토 외부에 위치한 서비스 제공업체에 이전합니다. PIPL 제38-43조에 따라 이러한 이전에 대해 귀하에게 알리고, 특정 경우에는 별도의 동의를 받아야 합니다.

## 해외 데이터 이전 이유

ReMynd는 현재 중국 본토 내에서만으로는 동등한 역량을 가진 동등한 서비스를 이용할 수 없기 때문에 여러 국제 AI 및 인프라 제공업체를 사용합니다. 당사는 각 이전의 필요성과 비례성을 평가했습니다.

## 이전 및 수신자

| 수신자 | 국가 | 이전되는 데이터 | 목적 | 훈련 사용 |
|--------|------|----------------|------|----------|
| DeepSeek | 중국 (PRC) | 익명화된 평가 관찰 (사례 ID만, 학생 이름 또는 생년월일 없음) | AI 평가 분석 | 계약으로 금지 |
| Google Gemini | 미국 | 익명화된 평가 도구 이미지 (사례 ID만) | 평가 자료의 AI 비전 분석 | 계약으로 금지 |
| Groq (Whisper) | 미국 | 음성 녹음 (별도 녹화 동의) | 음성-텍스트 전사 | 계약으로 금지 — 확인 대기 중 |
| Airwallex | 홍콩 / 다중 지역 | 구독 청구 정보 (평가 데이터 없음) | 결제 처리 | 해당 없음 |
| Google Docs API | 미국 | 완성된 보고서 내용 | PDF 보고서 생성 | 계약으로 금지 |
| Replit Object Storage | 미국 / 싱가포르 | 평가 파일, 음성 녹음 | 안전한 파일 스토리지 | 해당 없음 |

## 마련된 보호 조치

각 국경 간 이전에 대해 ReMynd는 다음 중 하나 이상을 구현했습니다:
- **계약 조항** — 수신자가 중국 법률과 동등한 보호를 제공하도록 요구
- **데이터 최소화** — 가능한 경우 익명화, 집계 또는 비식별 데이터만 전송
- **훈련 금지** — 모든 AI 벤더는 ReMynd 데이터를 모델 훈련에 사용하는 것을 계약으로 금지
- **암호화** — 데이터는 전송 및 저장 시 암호화

## 보안 평가

법률에서 요구하는 경우 (PIPL 제38조, CAC 데이터 출경 보안 평가 조치), ReMynd는 중국 국가인터넷정보판공실(CAC) 보안 평가 절차를 완료합니다. 이 평가는 [확정 예정 날짜]까지 완료될 계획입니다.

## 귀하의 권리

귀하는 다음 권리를 보유합니다:
- 본 고지 사본 수령
- 귀하의 특정 데이터가 해외로 이전되는지 확인
- 동의가 법적 근거인 이전에 대한 동의 철회
- 특정 이전에 대한 반대

연락처: privacy@remynd.com

## 연간 검토

본 고지는 연간 검토 및 업데이트됩니다. 이전의 지속적인 필요성과 적절성을 연간 검토합니다.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 9. Data Retention and Deletion Policy
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Data Retention and Deletion Policy",
    content_en: `# Data Retention and Deletion Policy

**Document Version:** 1.0 (Draft)

---

## 1. Purpose

This policy establishes minimum and maximum retention periods for all categories of personal information processed by ReMynd, and defines the procedures for secure deletion.

## 2. Retention Schedule

| Data Category | Retention Period | Legal Basis / Rationale |
|---------------|----------------|------------------------|
| Assessment questionnaire responses | 7 years after case closure | Professional standards; potential dispute resolution |
| Standardised test scores | 7 years after case closure | Professional standards |
| Assessment reports | 7 years after case closure | Professional standards; legal obligation |
| Clinical observations and notes | 7 years after case closure | Professional standards |
| Audio recordings | 1 year after case closure | Higher risk; no long-term clinical need |
| Video recordings | 1 year after case closure | Higher risk; no long-term clinical need |
| AI-generated analysis drafts | Retained as part of case record — 7 years | Audit trail |
| Parent/guardian consent forms | 7 years after case closure | Evidence of lawful processing |
| User account information | Duration of active relationship + 2 years | Dispute resolution |
| Billing records | 7 years | Statutory accounting obligation |
| Security audit logs | 1 year | Operational security |
| Cross-border transfer records | 3 years | Regulatory compliance |
| Data subject rights request records | 3 years | Regulatory compliance |

## 3. Deletion Procedures

### Standard Deletion
At the end of a retention period:
- Database records are permanently deleted using irreversible DELETE operations.
- Backups are purged within 30 days of the scheduled deletion date.
- Object storage files are permanently deleted using secure deletion APIs.

### Deletion on Request
On a verified request from a data subject or guardian:
- The request is logged in the rights request register.
- Data is reviewed against the retention schedule to identify any legal hold.
- If no legal hold applies, deletion is completed within 15 business days.
- The requestor receives written confirmation of deletion.

### Early Deletion — Audio and Video
Audio and video recordings are deleted **immediately** upon:
- Receipt of a withdrawal of recording consent
- Expiry of the 1-year retention period
- A specific deletion request from the subject or guardian

## 4. Legal Holds

Data subject to a legal hold (active dispute, regulatory investigation, or court order) is exempted from standard deletion schedules. Legal holds are documented and reviewed quarterly.

## 5. Third-Party Deletion

When ReMynd instructs a vendor to delete data:
- A written deletion instruction is issued.
- Confirmation of deletion must be received within 30 days.
- Non-confirmation is escalated to the Compliance Officer.

## 6. Review

This policy is reviewed annually and updated whenever retention obligations change due to law or professional standards.`,

    content_zh: `# 数据保留和删除政策

**文件版本：** 1.0（草稿）

---

## 1. 目的

本政策为ReMynd处理的所有类别个人信息规定最低和最高保留期，并定义安全删除程序。

## 2. 保留计划

| 数据类别 | 保留期限 | 法律依据/理由 |
|---------|---------|-------------|
| 评估问卷答案 | 案例结案后7年 | 专业标准；潜在争议解决 |
| 标准化测试分数 | 案例结案后7年 | 专业标准 |
| 评估报告 | 案例结案后7年 | 专业标准；法律义务 |
| 临床观察和记录 | 案例结案后7年 | 专业标准 |
| 录音 | 案例结案后1年 | 较高风险；无长期临床需求 |
| 录像 | 案例结案后1年 | 较高风险；无长期临床需求 |
| AI生成的分析草稿 | 作为案例记录的一部分保留——7年 | 审计追踪 |
| 家长/监护人同意书 | 案例结案后7年 | 合法处理的证据 |
| 用户账号信息 | 有效关系期间 + 2年 | 争议解决 |
| 账单记录 | 7年 | 法定会计义务 |
| 安全审计日志 | 1年 | 运营安全 |
| 跨境传输记录 | 3年 | 法规合规 |
| 数据主体权利请求记录 | 3年 | 法规合规 |

## 3. 删除程序

### 标准删除
在保留期届满时：
- 数据库记录使用不可逆的DELETE操作永久删除。
- 备份在计划删除日期后30天内清除。
- 对象存储文件使用安全删除API永久删除。

### 应请求删除
在收到数据主体或监护人的核实请求后：
- 请求记录在权利请求登记册中。
- 根据保留计划审查数据，识别任何法律保留。
- 如无法律保留，删除在15个工作日内完成。
- 请求者收到删除书面确认。

### 录音和录像的提前删除
以下情况下**立即**删除录音和录像：
- 收到录制同意撤回
- 1年保留期届满
- 来自主体或监护人的具体删除请求

## 4. 法律保留

受法律保留的数据（活跃争议、监管调查或法院命令）免于标准删除计划。法律保留须记录并每季度审查。

## 5. 第三方删除

当ReMynd指示供应商删除数据时：
- 发出书面删除指令。
- 必须在30天内收到删除确认。
- 未收到确认须上报合规官。

## 6. 审查

本政策每年审查，并在因法律或专业标准导致保留义务发生变化时更新。`,

    content_ko: `# 데이터 보유 및 삭제 정책

**문서 버전:** 1.0 (초안)

---

## 1. 목적

본 정책은 ReMynd가 처리하는 모든 범주의 개인정보에 대한 최소 및 최대 보유 기간을 수립하고, 안전한 삭제 절차를 정의합니다.

## 2. 보유 일정

| 데이터 범주 | 보유 기간 | 법적 근거/이유 |
|------------|---------|--------------|
| 평가 설문지 응답 | 사례 종료 후 7년 | 전문 기준; 잠재적 분쟁 해결 |
| 표준화 검사 점수 | 사례 종료 후 7년 | 전문 기준 |
| 평가 보고서 | 사례 종료 후 7년 | 전문 기준; 법적 의무 |
| 임상 관찰 및 기록 | 사례 종료 후 7년 | 전문 기준 |
| 음성 녹음 | 사례 종료 후 1년 | 높은 위험; 장기 임상 필요 없음 |
| 영상 녹화 | 사례 종료 후 1년 | 높은 위험; 장기 임상 필요 없음 |
| AI 생성 분석 초안 | 사례 기록의 일부로 보유 — 7년 | 감사 추적 |
| 부모/보호자 동의서 | 사례 종료 후 7년 | 적법한 처리의 증거 |
| 사용자 계정 정보 | 활성 관계 기간 + 2년 | 분쟁 해결 |
| 청구 기록 | 7년 | 법정 회계 의무 |
| 보안 감사 로그 | 1년 | 운영 보안 |
| 국경 간 이전 기록 | 3년 | 규제 준수 |
| 데이터 주체 권리 요청 기록 | 3년 | 규제 준수 |

## 3. 삭제 절차

### 표준 삭제
보유 기간 종료 시:
- 데이터베이스 기록은 복구 불가능한 DELETE 작업으로 영구 삭제됩니다.
- 백업은 예정된 삭제 날짜로부터 30일 내에 제거됩니다.
- 객체 스토리지 파일은 안전한 삭제 API를 사용하여 영구 삭제됩니다.

### 요청에 의한 삭제
데이터 주체 또는 보호자의 확인된 요청 시:
- 요청이 권리 요청 등록부에 기록됩니다.
- 데이터를 보유 일정과 대조하여 법적 보류를 식별합니다.
- 법적 보류가 없는 경우 15영업일 내에 삭제가 완료됩니다.
- 요청자는 삭제에 대한 서면 확인을 받습니다.

### 음성 및 영상의 조기 삭제
다음 경우 음성 및 영상 녹화물을 **즉시** 삭제합니다:
- 녹화 동의 철회 접수
- 1년 보유 기간 만료
- 주체 또는 보호자의 구체적인 삭제 요청

## 4. 법적 보류

법적 보류(활성 분쟁, 규제 조사 또는 법원 명령) 대상 데이터는 표준 삭제 일정에서 면제됩니다. 법적 보류는 문서화되며 분기별로 검토됩니다.

## 5. 제3자 삭제

ReMynd가 벤더에게 데이터 삭제를 지시할 때:
- 서면 삭제 지시가 발행됩니다.
- 삭제 확인을 30일 내에 받아야 합니다.
- 미확인 시 컴플라이언스 책임자에게 에스컬레이션됩니다.

## 6. 검토

본 정책은 연간 검토되며, 법률 또는 전문 기준으로 인해 보유 의무가 변경될 때마다 업데이트됩니다.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 10. Information Security Policy
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Information Security Policy",
    content_en: `# Information Security Policy

**Document Version:** 1.0 (Draft)

---

## 1. Purpose

This policy establishes minimum security standards for the protection of personal information and system assets within the ReMynd platform. It applies to all personnel, contractors, and systems with access to RAOS or the data it processes.

## 2. Access Control

- All user accounts are protected by a unique username and strong password (minimum 12 characters, including uppercase, lowercase, numbers, and symbols).
- Role-based access control (RBAC) ensures personnel access only the data necessary for their role.
- Administrator access is restricted to named individuals and logged.
- Inactive accounts are deactivated after 90 days of non-use.
- Password reset requires email verification.

## 3. Data Encryption

- **At rest:** All database fields containing personal information are encrypted using AES-256 or equivalent. Object storage files (assessment documents, audio recordings) are encrypted at the storage layer.
- **In transit:** All communication uses TLS 1.2 or higher. Unencrypted HTTP connections are rejected.

## 4. Audit Logging

- All access to sensitive records (assessment scores, reports, audio files) is logged with user ID, timestamp, and action.
- All administrative actions (user creation, role changes, data deletion) are logged.
- Logs are retained for 1 year and are read-only for non-administrators.

## 5. Incident Response

Security incidents are handled according to the Security Incident Response Plan. Incidents must be reported to the Compliance Officer within 2 hours of discovery. Data subjects and regulators are notified in accordance with legal requirements.

## 6. Vendor Security

All vendors processing ReMynd data must:
- Accept the Vendor Data Processing Agreement
- Demonstrate equivalent security measures
- Report security incidents affecting ReMynd data within 72 hours

## 7. Backup and Recovery

- Database backups are performed daily and retained for 30 days.
- Backups are encrypted and stored in a geographically separate location.
- Recovery procedures are tested annually.

## 8. Employee Security

- All staff complete security awareness training on joining and annually thereafter.
- Phishing simulation exercises are conducted quarterly.
- Staff must report security concerns to Compliance immediately.
- All staff sign the Staff Confidentiality Agreement.

## 9. Vulnerability Management

- Software dependencies are reviewed monthly for known vulnerabilities.
- Critical patches are applied within 7 days of availability.
- Penetration testing is conducted annually.

## 10. Review

This policy is reviewed annually and following any significant security incident.`,

    content_zh: `# 信息安全政策

**文件版本：** 1.0（草稿）

---

## 1. 目的

本政策为ReMynd平台内个人信息和系统资产的保护建立最低安全标准。适用于所有能访问RAOS或其处理数据的人员、承包商和系统。

## 2. 访问控制

- 所有用户账号受唯一用户名和强密码保护（最少12个字符，包括大写、小写、数字和符号）。
- 基于角色的访问控制（RBAC）确保人员仅访问其角色所需的数据。
- 管理员访问权限限于具名个人并记录日志。
- 非活跃账号在90天未使用后停用。
- 密码重置需要邮件验证。

## 3. 数据加密

- **静态：** 包含个人信息的所有数据库字段使用AES-256或同等标准加密。对象存储文件（评估文件、录音）在存储层加密。
- **传输中：** 所有通信使用TLS 1.2或更高版本。未加密的HTTP连接被拒绝。

## 4. 审计日志

- 对敏感记录（评估分数、报告、音频文件）的所有访问均记录用户ID、时间戳和操作。
- 所有管理操作（用户创建、角色更改、数据删除）均记录日志。
- 日志保留1年，非管理员只读。

## 5. 事件响应

安全事件按照《安全事件响应计划》处理。事件必须在发现后2小时内向合规官报告。依法律要求通知数据主体和监管机构。

## 6. 供应商安全

所有处理ReMynd数据的供应商必须：
- 接受《供应商数据处理协议》
- 展示同等安全措施
- 在72小时内报告影响ReMynd数据的安全事件

## 7. 备份和恢复

- 数据库备份每日进行，保留30天。
- 备份加密存储于地理上分离的位置。
- 恢复程序每年测试一次。

## 8. 员工安全

- 所有员工入职时及此后每年完成安全意识培训。
- 网络钓鱼模拟演练每季度进行一次。
- 员工必须立即向合规部门报告安全问题。
- 所有员工签署《员工保密协议》。

## 9. 漏洞管理

- 软件依赖项每月审查已知漏洞。
- 关键补丁在可用后7天内应用。
- 渗透测试每年进行一次。

## 10. 审查

本政策每年审查，并在任何重大安全事件后进行审查。`,

    content_ko: `# 정보 보안 정책

**문서 버전:** 1.0 (초안)

---

## 1. 목적

본 정책은 ReMynd 플랫폼 내 개인정보 및 시스템 자산 보호를 위한 최소 보안 기준을 수립합니다. RAOS 또는 처리 데이터에 접근하는 모든 직원, 계약자 및 시스템에 적용됩니다.

## 2. 접근 통제

- 모든 사용자 계정은 고유한 사용자 이름과 강력한 비밀번호(최소 12자, 대문자, 소문자, 숫자, 기호 포함)로 보호됩니다.
- 역할 기반 접근 통제(RBAC)는 직원이 자신의 역할에 필요한 데이터에만 접근하도록 합니다.
- 관리자 접근은 지정된 개인으로 제한되며 로그에 기록됩니다.
- 비활성 계정은 90일 미사용 후 비활성화됩니다.
- 비밀번호 재설정은 이메일 인증이 필요합니다.

## 3. 데이터 암호화

- **저장 시:** 개인정보를 포함하는 모든 데이터베이스 필드는 AES-256 또는 동급 암호화를 사용합니다. 객체 스토리지 파일(평가 문서, 음성 녹음)은 스토리지 계층에서 암호화됩니다.
- **전송 중:** 모든 통신은 TLS 1.2 이상을 사용합니다. 암호화되지 않은 HTTP 연결은 거부됩니다.

## 4. 감사 로그

- 민감한 기록(평가 점수, 보고서, 오디오 파일)에 대한 모든 접근은 사용자 ID, 타임스탬프 및 작업과 함께 기록됩니다.
- 모든 관리 작업(사용자 생성, 역할 변경, 데이터 삭제)이 기록됩니다.
- 로그는 1년간 보유되며 비관리자는 읽기 전용입니다.

## 5. 사고 대응

보안 사고는 보안 사고 대응 계획에 따라 처리됩니다. 사고는 발견 후 2시간 내에 컴플라이언스 책임자에게 보고해야 합니다. 법적 요건에 따라 데이터 주체와 규제 기관에 통보합니다.

## 6. 벤더 보안

ReMynd 데이터를 처리하는 모든 벤더는:
- 벤더 데이터 처리 계약 수용
- 동등한 보안 조치 시연
- ReMynd 데이터에 영향을 미치는 보안 사고를 72시간 내에 보고

## 7. 백업 및 복구

- 데이터베이스 백업은 매일 수행되며 30일간 보유됩니다.
- 백업은 암호화되어 지리적으로 분리된 위치에 저장됩니다.
- 복구 절차는 연간 테스트됩니다.

## 8. 직원 보안

- 모든 직원은 입사 시 및 이후 연간 보안 인식 교육을 이수합니다.
- 피싱 시뮬레이션 훈련이 분기별로 실시됩니다.
- 직원은 보안 우려 사항을 즉시 컴플라이언스에 보고해야 합니다.
- 모든 직원은 직원 기밀 유지 계약서에 서명합니다.

## 9. 취약점 관리

- 소프트웨어 종속성은 매월 알려진 취약점을 검토합니다.
- 중요 패치는 이용 가능 후 7일 내에 적용됩니다.
- 침투 테스트는 연간 실시됩니다.

## 10. 검토

본 정책은 연간 검토되며 중요한 보안 사고 이후에도 검토됩니다.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 11. Privacy Rights Request Procedure
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Privacy Rights Request Procedure",
    content_en: `# Privacy Rights Request Procedure

**Document Version:** 1.0 (Draft)

---

## 1. Purpose

This procedure establishes how ReMynd handles requests from individuals (or their guardians) to exercise their rights under PIPL.

## 2. Rights Covered

| Right | Description |
|-------|-------------|
| Access | Right to obtain a copy of personal information held |
| Correction | Right to correct inaccurate or incomplete information |
| Deletion | Right to request deletion of personal information |
| Portability | Right to receive personal information in a structured format |
| Restriction | Right to restrict processing in certain circumstances |
| Objection | Right to object to processing based on legitimate interests |
| Withdraw Consent | Right to withdraw consent for consent-based processing |
| Explanation | Right to explanation of automated decision-making |

## 3. How to Submit a Request

Requests must be submitted to **privacy@remynd.com** with the subject line "Privacy Rights Request."

The request should include:
- Full name of the data subject
- Relationship (self / parent / guardian)
- Description of the right being exercised
- Sufficient information to identify the relevant records

## 4. Identity Verification

To protect against fraudulent requests, we will verify identity before processing any request:
- **Email verification:** Requests must come from the registered email address, or
- **Document verification:** A copy of a government-issued ID may be requested

For guardian requests on behalf of a minor, proof of guardianship may be required.

## 5. Response Timelines

| Request Type | Response Deadline |
|-------------|-----------------|
| Access | 15 business days |
| Correction | 15 business days |
| Deletion | 15 business days |
| Portability | 15 business days |
| Restriction / Objection | 15 business days |
| Withdrawal of Consent | Immediate (for future processing) |

If a request is complex or numerous, we may extend the deadline by a further 15 business days with written notification.

## 6. Grounds to Refuse

We may refuse a request where:
- We cannot verify the requester's identity
- The request is manifestly unfounded or excessive
- Deletion would conflict with legal retention obligations
- Deletion would affect the rights of another party (e.g. the school's right to records)

We will provide written reasons for any refusal.

## 7. Record Keeping

All rights requests and our responses are logged in the Rights Request Register and retained for 3 years.

## 8. Complaints

If you are unsatisfied with our response, you may:
- Ask for an internal review by the Compliance Officer
- Contact the Cyberspace Administration of China (CAC) or other competent authority`,

    content_zh: `# 隐私权利请求程序

**文件版本：** 1.0（草稿）

---

## 1. 目的

本程序规定ReMynd如何处理个人（或其监护人）根据个保法行使权利的请求。

## 2. 涵盖的权利

| 权利 | 说明 |
|------|------|
| 查阅 | 获取所持个人信息副本的权利 |
| 更正 | 更正不准确或不完整信息的权利 |
| 删除 | 要求删除个人信息的权利 |
| 可携带 | 以结构化格式接收个人信息的权利 |
| 限制 | 在特定情况下限制处理的权利 |
| 反对 | 反对基于合法权益处理的权利 |
| 撤回同意 | 撤回基于同意处理的权利 |
| 解释 | 获得自动化决策解释的权利 |

## 3. 如何提交请求

请求须提交至 **privacy@remynd.com**，主题为"隐私权利请求"。

请求应包含：
- 数据主体的全名
- 关系（本人/父母/监护人）
- 行使的权利描述
- 足以识别相关记录的充分信息

## 4. 身份验证

为防止欺诈性请求，我们将在处理任何请求前验证身份：
- **邮件验证：** 请求须来自注册邮箱地址，或
- **文件验证：** 可能要求提供政府颁发的身份证件副本

对于监护人代表未成年人提出的请求，可能需要提供监护关系证明。

## 5. 响应时限

| 请求类型 | 响应截止时间 |
|---------|-----------|
| 查阅 | 15个工作日 |
| 更正 | 15个工作日 |
| 删除 | 15个工作日 |
| 可携带 | 15个工作日 |
| 限制/反对 | 15个工作日 |
| 撤回同意 | 即时（对未来处理） |

如果请求复杂或数量众多，我们可能在书面通知后将截止时间再延长15个工作日。

## 6. 拒绝理由

我们可能在以下情况下拒绝请求：
- 我们无法验证请求者的身份
- 请求明显无根据或过于繁琐
- 删除与法定保留义务冲突
- 删除会影响另一方的权利（例如学校的记录权利）

我们将提供拒绝的书面理由。

## 7. 记录保存

所有权利请求及我们的响应均记录在权利请求登记册中，保留3年。

## 8. 投诉

如果对我们的响应不满意，您可以：
- 要求合规官进行内部审查
- 联系国家互联网信息办公室（网信办）或其他主管机构`,

    content_ko: `# 개인정보 권리 요청 절차

**문서 버전:** 1.0 (초안)

---

## 1. 목적

본 절차는 ReMynd가 PIPL에 따라 권리를 행사하려는 개인(또는 보호자)의 요청을 처리하는 방법을 규정합니다.

## 2. 적용 권리

| 권리 | 설명 |
|------|------|
| 열람 | 보유한 개인정보 사본을 받을 권리 |
| 정정 | 부정확하거나 불완전한 정보를 정정할 권리 |
| 삭제 | 개인정보 삭제를 요청할 권리 |
| 이동성 | 구조화된 형식으로 개인정보를 받을 권리 |
| 제한 | 특정 상황에서 처리를 제한할 권리 |
| 반대 | 정당한 이익에 기반한 처리에 반대할 권리 |
| 동의 철회 | 동의 기반 처리에 대한 동의를 철회할 권리 |
| 설명 | 자동화된 의사결정에 대한 설명을 받을 권리 |

## 3. 요청 방법

요청은 제목 "개인정보 권리 요청"과 함께 **privacy@remynd.com**으로 제출해야 합니다.

요청에는 다음이 포함되어야 합니다:
- 데이터 주체의 전체 이름
- 관계 (본인/부모/보호자)
- 행사하는 권리 설명
- 관련 기록을 식별하기에 충분한 정보

## 4. 신원 확인

사기성 요청으로부터 보호하기 위해 요청 처리 전 신원을 확인합니다:
- **이메일 확인:** 요청은 등록된 이메일 주소에서 와야 하거나
- **서류 확인:** 정부 발급 신분증 사본이 요청될 수 있음

미성년자를 대신한 보호자 요청의 경우 보호자 관계 증명이 필요할 수 있습니다.

## 5. 응답 기한

| 요청 유형 | 응답 기한 |
|----------|---------|
| 열람 | 15영업일 |
| 정정 | 15영업일 |
| 삭제 | 15영업일 |
| 이동성 | 15영업일 |
| 제한/반대 | 15영업일 |
| 동의 철회 | 즉시 (향후 처리에 대해) |

요청이 복잡하거나 다수인 경우 서면 통지와 함께 기한을 15영업일 추가 연장할 수 있습니다.

## 6. 거부 근거

다음 경우 요청을 거부할 수 있습니다:
- 요청자의 신원을 확인할 수 없는 경우
- 요청이 명백히 근거 없거나 과도한 경우
- 삭제가 법정 보유 의무와 충돌하는 경우
- 삭제가 타인의 권리에 영향을 미치는 경우 (예: 기록에 대한 학교의 권리)

거부에 대한 서면 이유를 제공합니다.

## 7. 기록 유지

모든 권리 요청 및 응답은 권리 요청 등록부에 기록되며 3년간 보유됩니다.

## 8. 민원 제기

응답에 불만족스럽다면:
- 컴플라이언스 책임자에 의한 내부 검토 요청
- 중국 국가인터넷정보판공실(CAC) 또는 관할 기관에 연락`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 12. Security Incident Response Plan
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Security Incident Response Plan",
    content_en: `# Security Incident Response Plan

**Document Version:** 1.0 (Draft)

---

## 1. Purpose

This plan provides a structured procedure for identifying, containing, assessing, and recovering from security incidents affecting personal information processed by ReMynd.

## 2. Incident Classification

| Severity | Description | Examples |
|----------|-------------|---------|
| Critical | Large-scale breach; data of many individuals exposed | Database dump leaked; ransomware attack |
| High | Confirmed breach of sensitive personal information | Audio recording accessed by unauthorised party; AI vendor breach |
| Medium | Potential breach; investigation required | Unusual access pattern; lost device with cached data |
| Low | Minor incident; no confirmed data exposure | Failed login spike; configuration error with no data impact |

## 3. Incident Response Stages

### Stage 1 — Detection and Reporting (0–2 hours)
- Any staff member discovering a suspected incident must immediately notify the Compliance Officer by phone or secure message.
- The Compliance Officer logs the incident and assembles the Incident Response Team (IRT).
- All affected systems are preserved in their current state (no deletion of logs).

### Stage 2 — Containment (2–8 hours)
- Immediate steps to prevent further data exposure:
  - Revoke compromised credentials
  - Isolate affected systems
  - Block malicious network traffic
  - Notify affected vendors

### Stage 3 — Assessment (8–24 hours)
- Determine the scope: what data was accessed/exfiltrated, how many individuals affected, which categories of data.
- Classify the incident severity.
- Determine notification obligations.

### Stage 4 — Notification

**Internal notification:** IRT and senior management — within 2 hours of discovery.

**Vendor notification:** Affected sub-processors — within 24 hours.

**Regulatory notification:** CAC and competent authorities — within 24 hours for incidents that "may" affect individual rights and interests; within 72 hours for confirmed breaches.

**Individual notification:** Affected data subjects — without undue delay for high/critical incidents. Notification must include: description of incident, data affected, steps taken, and contact for questions.

### Stage 5 — Recovery (1–7 days)
- Restore systems from clean backups.
- Patch vulnerabilities that enabled the incident.
- Verify restoration completeness.

### Stage 6 — Post-Incident Review (within 30 days)
- Root cause analysis.
- Documentation of lessons learned.
- Policy and control updates.
- Test of updated controls.

## 4. Contact List

| Role | Contact |
|------|---------|
| Compliance Officer | [To be appointed] |
| Technical Lead | [To be appointed] |
| Legal Counsel | [To be appointed] |
| CAC Reporting Portal | https://www.cac.gov.cn |

## 5. Drills

Incident response drills are conducted annually to test response readiness.`,

    content_zh: `# 安全事件响应计划

**文件版本：** 1.0（草稿）

---

## 1. 目的

本计划为识别、遏制、评估和恢复影响ReMynd处理的个人信息的安全事件提供结构化程序。

## 2. 事件分类

| 严重程度 | 描述 | 示例 |
|---------|------|------|
| 严重 | 大规模泄露；大量个人数据暴露 | 数据库转储泄露；勒索软件攻击 |
| 高 | 确认敏感个人信息泄露 | 录音被未授权方访问；AI供应商泄露 |
| 中 | 潜在泄露；需要调查 | 异常访问模式；丢失含缓存数据的设备 |
| 低 | 轻微事件；无确认数据暴露 | 登录尝试失败激增；无数据影响的配置错误 |

## 3. 事件响应阶段

### 第一阶段——检测和报告（0-2小时）
- 发现疑似事件的任何工作人员必须立即通过电话或安全消息通知合规官。
- 合规官记录事件并组建事件响应团队（IRT）。
- 受影响的系统以当前状态保存（不删除日志）。

### 第二阶段——遏制（2-8小时）
- 防止进一步数据暴露的即时措施：
  - 撤销被泄露的凭证
  - 隔离受影响系统
  - 阻断恶意网络流量
  - 通知受影响的供应商

### 第三阶段——评估（8-24小时）
- 确定范围：访问/泄露了哪些数据、影响了多少人、哪些类别的数据。
- 对事件严重程度进行分类。
- 确定通知义务。

### 第四阶段——通知

**内部通知：** IRT和高级管理人员——在发现后2小时内。

**供应商通知：** 受影响的次级处理者——在24小时内。

**监管通知：** 网信办和主管机构——对于"可能"影响个人权益的事件在24小时内；对于确认的泄露在72小时内。

**个人通知：** 受影响的数据主体——对于高/严重事件及时通知。通知必须包括：事件描述、受影响数据、已采取措施和问题联系方式。

### 第五阶段——恢复（1-7天）
- 从干净的备份恢复系统。
- 修补导致事件的漏洞。
- 验证恢复完整性。

### 第六阶段——事后审查（30天内）
- 根本原因分析。
- 经验教训文件记录。
- 政策和控制措施更新。
- 更新后控制措施的测试。

## 4. 联系人列表

| 角色 | 联系方式 |
|------|---------|
| 合规官 | [待任命] |
| 技术负责人 | [待任命] |
| 法律顾问 | [待任命] |
| 网信办报告门户 | https://www.cac.gov.cn |

## 5. 演练

每年进行事件响应演练以测试响应准备度。`,

    content_ko: `# 보안 사고 대응 계획

**문서 버전:** 1.0 (초안)

---

## 1. 목적

본 계획은 ReMynd가 처리하는 개인정보에 영향을 미치는 보안 사고를 식별, 봉쇄, 평가 및 복구하기 위한 구조화된 절차를 제공합니다.

## 2. 사고 분류

| 심각도 | 설명 | 예시 |
|-------|------|------|
| 심각 | 대규모 침해; 많은 개인의 데이터 노출 | 데이터베이스 덤프 유출; 랜섬웨어 공격 |
| 높음 | 민감한 개인정보 침해 확인 | 음성 녹음에 무단 접근; AI 벤더 침해 |
| 보통 | 잠재적 침해; 조사 필요 | 비정상적인 접근 패턴; 캐시 데이터가 있는 기기 분실 |
| 낮음 | 경미한 사고; 확인된 데이터 노출 없음 | 로그인 실패 급증; 데이터 영향 없는 구성 오류 |

## 3. 사고 대응 단계

### 1단계 — 탐지 및 보고 (0-2시간)
- 의심스러운 사고를 발견한 직원은 즉시 전화 또는 보안 메시지로 컴플라이언스 책임자에게 알려야 합니다.
- 컴플라이언스 책임자가 사고를 기록하고 사고 대응 팀(IRT)을 소집합니다.
- 영향받은 시스템은 현재 상태로 보존됩니다 (로그 삭제 금지).

### 2단계 — 봉쇄 (2-8시간)
- 추가 데이터 노출을 방지하기 위한 즉각적인 조치:
  - 손상된 자격 증명 취소
  - 영향받은 시스템 격리
  - 악의적인 네트워크 트래픽 차단
  - 영향받은 벤더에 통보

### 3단계 — 평가 (8-24시간)
- 범위 파악: 어떤 데이터가 접근/유출되었는지, 영향받은 개인 수, 어떤 범주의 데이터.
- 사고 심각도 분류.
- 통보 의무 결정.

### 4단계 — 통보

**내부 통보:** IRT 및 고위 경영진 — 발견 후 2시간 내.

**벤더 통보:** 영향받은 하위 처리자 — 24시간 내.

**규제 통보:** CAC 및 관할 기관 — 개인의 권리와 이익에 "영향을 미칠 수 있는" 사고는 24시간 내; 확인된 침해는 72시간 내.

**개인 통보:** 영향받은 데이터 주체 — 높음/심각 사고는 지체 없이. 통보에는 사고 설명, 영향받은 데이터, 취해진 조치 및 문의 연락처가 포함되어야 합니다.

### 5단계 — 복구 (1-7일)
- 깨끗한 백업에서 시스템 복원.
- 사고를 가능하게 한 취약점 패치.
- 복원 완전성 확인.

### 6단계 — 사후 검토 (30일 내)
- 근본 원인 분석.
- 교훈 문서화.
- 정책 및 통제 업데이트.
- 업데이트된 통제 테스트.

## 4. 연락처 목록

| 역할 | 연락처 |
|------|-------|
| 컴플라이언스 책임자 | [선임 예정] |
| 기술 책임자 | [선임 예정] |
| 법률 자문 | [선임 예정] |
| CAC 보고 포털 | https://www.cac.gov.cn |

## 5. 훈련

대응 준비 상태를 테스트하기 위해 연간 사고 대응 훈련이 실시됩니다.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 13. AI and Automated Analysis Policy
  // ─────────────────────────────────────────────────────────────────
  {
    name: "AI and Automated Analysis Policy",
    content_en: `# AI and Automated Analysis Policy

**Document Version:** 1.0 (Draft)

---

## 1. Purpose

This policy governs ReMynd's use of artificial intelligence and automated tools in the assessment process. It ensures AI use complies with PIPL's requirements for automated decision-making and is transparent to data subjects.

## 2. AI Tools in Use

| Tool | Provider | Purpose | Data Sent | Location |
|------|----------|---------|-----------|---------|
| Intake Analysis | DeepSeek | Analyse questionnaire responses, identify preliminary patterns | Anonymised assessment data (case ID, scores, observations) | China |
| Report Drafting | DeepSeek | Generate draft report sections | Anonymised assessment data + school name | China |
| Vision Analysis | Google Gemini | Analyse images of assessment materials | Anonymised images | USA |
| Audio Transcription | Groq Whisper | Transcribe assessment session recordings | Audio recordings (with recording consent) | USA |
| RAMRI Interview | DeepSeek | Structured interview analysis | Interview transcript (case ID only) | China |
| RAEPA Assessment | DeepSeek | Executive function assessment | Anonymised responses | China |

## 3. Data Minimisation in AI Prompts

Before any data is sent to an AI service:
- Student **name is replaced** with the case identifier (e.g., "CASE-abc123")
- Student **date of birth is removed** from all prompts
- Free-text responses mentioning names or personal identifiers are reviewed before submission (Phase 2 target)

## 4. Human Review Requirement

**All AI-generated content is supplementary to human clinical judgment.** No AI output is included in an assessment report without review and approval by a qualified psychometrician. The psychometrician's professional judgment takes precedence over any AI-generated analysis.

AI outputs are:
- Clearly marked as AI-generated in the system
- Editable by the psychometrician before inclusion in reports
- Not communicated directly to schools, parents, or students without psychometrician review

## 5. No Automated Decisions

ReMynd does not make fully automated decisions that have significant legal or similarly significant effects on individuals. All diagnostic conclusions, recommendations, and report content require human professional review. This policy complies with PIPL Article 24.

## 6. Training Data Prohibition

No vendor is permitted to use personal information processed through RAOS to train, fine-tune, or improve AI models without explicit written consent from ReMynd. This prohibition is documented in all vendor DPAs.

## 7. Cross-Border AI Transfers

AI processing by providers outside mainland China is subject to:
- The Cross-Border Data Transfer Notice
- Contractual prohibitions on data training
- Annual review of necessity and alternative domestic providers

## 8. Transparency to Data Subjects

Parents, guardians, and (where appropriate) students are informed at the point of consent:
- That AI tools are used in the assessment process
- What data is sent to AI services (anonymised)
- That all AI outputs are reviewed by a human professional
- How to decline AI analysis

## 9. Audit and Review

AI usage is reviewed annually including:
- Which tools are in use
- Accuracy and clinical validity of AI outputs
- Emerging domestic alternatives
- New regulatory requirements

## 10. Groq Audio Transcription — Pending Action

Audio transcription by Groq involves transferring audio recordings outside mainland China. This is the highest-risk AI processing activity. **A recording consent form that specifically addresses this transfer is required before audio transcription is used clinically.** Phase 1 action: finalise recording consent to include explicit notice of Groq/USA processing.`,

    content_zh: `# AI与自动化分析政策

**文件版本：** 1.0（草稿）

---

## 1. 目的

本政策规范ReMynd在评估过程中使用人工智能和自动化工具的行为。确保AI使用符合个保法关于自动化决策的要求，并对数据主体保持透明。

## 2. 使用中的AI工具

| 工具 | 提供商 | 目的 | 发送的数据 | 位置 |
|------|--------|------|----------|------|
| 接案分析 | DeepSeek | 分析问卷答案，识别初步模式 | 匿名评估数据（案例ID、分数、观察） | 中国 |
| 报告起草 | DeepSeek | 生成报告章节草稿 | 匿名评估数据 + 学校名称 | 中国 |
| 视觉分析 | Google Gemini | 分析评估材料图像 | 匿名图像 | 美国 |
| 音频转录 | Groq Whisper | 转录评估会话录音 | 录音（须有录制同意） | 美国 |
| RAMRI访谈 | DeepSeek | 结构化访谈分析 | 访谈记录（仅案例ID） | 中国 |
| RAEPA评估 | DeepSeek | 执行功能评估 | 匿名答案 | 中国 |

## 3. AI提示词中的数据最小化

在将任何数据发送到AI服务之前：
- 学生**姓名替换**为案例标识符（例如"CASE-abc123"）
- 学生**出生日期从所有提示词中删除**
- 提及姓名或个人标识符的自由文本答案在提交前进行审查（第二阶段目标）

## 4. 人工审查要求

**所有AI生成的内容都是对人类临床判断的补充。** 没有任何AI输出在未经合格心理测量师审查和批准的情况下被纳入评估报告。心理测量师的专业判断优先于任何AI生成的分析。

AI输出：
- 在系统中清楚标记为AI生成
- 在纳入报告之前可由心理测量师编辑
- 未经心理测量师审查，不直接传达给学校、家长或学生

## 5. 无自动化决策

ReMynd不对个人做出具有重大法律影响或类似重大影响的完全自动化决策。所有诊断结论、建议和报告内容均需要人类专业人员审查。本政策符合个保法第24条。

## 6. 训练数据禁止

未经ReMynd明确书面同意，任何供应商不得使用通过RAOS处理的个人信息来训练、微调或改进AI模型。这一禁止条款记录在所有供应商数据处理协议中。

## 7. 跨境AI传输

在中国大陆以外的提供商进行的AI处理须遵守：
- 《跨境数据传输通知》
- 禁止数据训练的合同条款
- 对必要性和国内替代提供商的年度审查

## 8. 对数据主体的透明度

在取得同意时，告知家长、监护人和（在适当情况下）学生：
- 评估过程中使用了AI工具
- 发送给AI服务的数据内容（匿名化）
- 所有AI输出均由人类专业人员审查
- 如何拒绝AI分析

## 9. 审计和审查

AI使用情况每年审查，包括：
- 使用中的工具
- AI输出的准确性和临床有效性
- 新兴国内替代方案
- 新的监管要求

## 10. Groq音频转录——待处理事项

Groq的音频转录涉及将录音传输至中国大陆以外。这是风险最高的AI处理活动。**在临床使用音频转录之前，需要一份明确说明此类传输的录制同意书。** 第一阶段行动：最终确定录制同意书，包含关于Groq/美国处理的明确通知。`,

    content_ko: `# AI 및 자동화 분석 정책

**문서 버전:** 1.0 (초안)

---

## 1. 목적

본 정책은 평가 과정에서 ReMynd의 인공지능 및 자동화 도구 사용을 규율합니다. AI 사용이 자동화된 의사결정에 관한 PIPL 요건을 준수하고 데이터 주체에게 투명하게 이루어지도록 합니다.

## 2. 사용 중인 AI 도구

| 도구 | 제공업체 | 목적 | 전송되는 데이터 | 위치 |
|------|---------|------|----------------|------|
| 접수 분석 | DeepSeek | 설문지 응답 분석, 예비 패턴 식별 | 익명화된 평가 데이터 (사례 ID, 점수, 관찰) | 중국 |
| 보고서 작성 | DeepSeek | 보고서 섹션 초안 생성 | 익명화된 평가 데이터 + 학교명 | 중국 |
| 비전 분석 | Google Gemini | 평가 자료 이미지 분석 | 익명화된 이미지 | 미국 |
| 음성 전사 | Groq Whisper | 평가 세션 녹음 전사 | 음성 녹음 (녹화 동의 필요) | 미국 |
| RAMRI 면담 | DeepSeek | 구조화된 면담 분석 | 면담 기록 (사례 ID만) | 중국 |
| RAEPA 평가 | DeepSeek | 실행 기능 평가 | 익명화된 응답 | 중국 |

## 3. AI 프롬프트에서의 데이터 최소화

데이터를 AI 서비스에 전송하기 전:
- 학생 **이름이** 사례 식별자로 **교체**됩니다 (예: "CASE-abc123")
- 학생 **생년월일이 모든 프롬프트에서 제거**됩니다
- 이름이나 개인 식별자가 언급된 자유 텍스트 응답은 제출 전 검토됩니다 (2단계 목표)

## 4. 인간 검토 요건

**모든 AI 생성 내용은 인간의 임상 판단을 보조합니다.** 자격 있는 심리 측정사의 검토 및 승인 없이 AI 출력물이 평가 보고서에 포함되지 않습니다. 심리 측정사의 전문적 판단이 AI 생성 분석보다 우선합니다.

AI 출력물은:
- 시스템에서 AI 생성으로 명확히 표시
- 보고서 포함 전 심리 측정사가 편집 가능
- 심리 측정사 검토 없이 학교, 부모 또는 학생에게 직접 전달하지 않음

## 5. 자동화된 의사결정 없음

ReMynd는 개인에게 중요한 법적 또는 유사한 중요한 영향을 미치는 완전 자동화된 결정을 내리지 않습니다. 모든 진단 결론, 권고 사항 및 보고서 내용은 인간 전문가의 검토가 필요합니다. 본 정책은 PIPL 제24조를 준수합니다.

## 6. 훈련 데이터 금지

ReMynd의 명시적 서면 동의 없이 어떤 벤더도 RAOS를 통해 처리된 개인정보를 AI 모델 훈련, 미세 조정 또는 개선에 사용할 수 없습니다. 이 금지 조항은 모든 벤더 DPA에 문서화됩니다.

## 7. 국경 간 AI 이전

중국 본토 외부 제공업체에 의한 AI 처리는 다음을 적용합니다:
- 국경 간 데이터 이전 고지
- 데이터 훈련에 대한 계약적 금지
- 필요성 및 국내 대안 제공업체에 대한 연간 검토

## 8. 데이터 주체에 대한 투명성

동의 시점에 부모, 보호자 및 (적절한 경우) 학생에게 알립니다:
- 평가 과정에서 AI 도구가 사용됨
- AI 서비스에 전송되는 데이터 내용 (익명화)
- 모든 AI 출력물은 인간 전문가가 검토
- AI 분석 거부 방법

## 9. 감사 및 검토

AI 사용은 연간 검토되며 포함 내용:
- 사용 중인 도구
- AI 출력물의 정확성 및 임상 유효성
- 새로운 국내 대안
- 새로운 규제 요건

## 10. Groq 음성 전사 — 대기 중인 조치

Groq에 의한 음성 전사는 음성 녹음을 중국 본토 외부로 이전하는 것을 포함합니다. 이는 가장 위험도가 높은 AI 처리 활동입니다. **음성 전사를 임상적으로 사용하기 전에 이러한 이전을 명시적으로 다루는 녹화 동의서가 필요합니다.** 1단계 조치: Groq/미국 처리에 대한 명시적 고지를 포함한 녹화 동의서 최종 확정.`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 14. Staff Confidentiality Agreement
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Staff Confidentiality Agreement",
    content_en: `# Staff Confidentiality Agreement

**Document Version:** 1.0 (Draft)

---

## Agreement

This Agreement is between ReMynd Technology ("ReMynd") and the staff member named below ("Staff Member").

## 1. Scope of Confidential Information

As a condition of employment or engagement with ReMynd, the Staff Member agrees to maintain the confidentiality of all information they access through the RAOS platform, including but not limited to:

- Personal information of students, parents, guardians, and school staff
- Psychological assessment records, scores, and reports
- Audio and video recordings of assessment sessions
- AI-generated analysis and draft reports
- Proprietary assessment tools, scoring algorithms, and clinical methodologies
- Business information, client lists, and commercial terms

## 2. Obligations

The Staff Member agrees to:

a) Access personal information only to the extent necessary for their specific role.
b) Not share, copy, download, print, or transmit personal information without authorisation.
c) Not discuss individual cases in identifiable terms outside of clinical supervision or authorised case consultation.
d) Use only ReMynd-approved systems and tools for storing or processing assessment data.
e) Immediately report any suspected data breach, misuse, or unauthorised access to the Compliance Officer.
f) Complete all required data protection training.
g) Follow the Children's Personal Information Protection Policy when working with data about minors.
h) Maintain confidentiality obligations for a period of **3 years after termination** of employment or engagement.

## 3. Consequences of Breach

A breach of this Agreement may result in:
- Disciplinary action, including termination
- Civil liability for damages caused by the breach
- Criminal liability where applicable under PRC law

## 4. Acknowledgement

The Staff Member acknowledges that they have:
- Read and understood all applicable privacy and security policies
- Completed the required onboarding data protection training
- Had an opportunity to ask questions

---

**Staff Member:**

Name: _______________________
Role: _______________________
Signature: _______________________
Date: _______________________

**ReMynd Representative:**

Name: _______________________
Signature: _______________________
Date: _______________________`,

    content_zh: `# 员工保密协议

**文件版本：** 1.0（草稿）

---

## 协议

本协议由ReMynd科技（"ReMynd"）与下述工作人员（"员工"）签订。

## 1. 保密信息范围

作为与ReMynd就业或合作的条件，员工同意对其通过RAOS平台访问的所有信息保密，包括但不限于：

- 学生、家长、监护人和学校工作人员的个人信息
- 心理评估记录、分数和报告
- 评估会话的录音和录像
- AI生成的分析和报告草稿
- 专有评估工具、评分算法和临床方法论
- 业务信息、客户名单和商业条款

## 2. 义务

员工同意：

a) 仅在其特定角色必要范围内访问个人信息。
b) 未经授权不得共享、复制、下载、打印或传输个人信息。
c) 在临床督导或授权案例咨询之外，不以可识别的方式讨论个别案例。
d) 仅使用ReMynd批准的系统和工具存储或处理评估数据。
e) 立即向合规官报告任何疑似数据泄露、滥用或未授权访问。
f) 完成所有必要的数据保护培训。
g) 在处理未成年人数据时遵守《儿童个人信息保护政策》。
h) 在就业或合作终止后**3年内**维持保密义务。

## 3. 违约后果

违反本协议可能导致：
- 纪律处分，包括终止合同
- 因违约造成损害的民事责任
- 中国法律规定的适用刑事责任

## 4. 确认

员工确认：
- 已阅读并理解所有适用的隐私和安全政策
- 已完成入职数据保护培训
- 有机会提问

---

**员工：**

姓名：_______________________
职务：_______________________
签名：_______________________
日期：_______________________

**ReMynd代表：**

姓名：_______________________
签名：_______________________
日期：_______________________`,

    content_ko: `# 직원 기밀 유지 계약서

**문서 버전:** 1.0 (초안)

---

## 계약

본 계약은 ReMynd Technology("ReMynd")와 아래에 명시된 직원("직원") 간에 체결됩니다.

## 1. 기밀 정보의 범위

ReMynd와의 고용 또는 계약의 조건으로, 직원은 RAOS 플랫폼을 통해 접근하는 모든 정보의 기밀을 유지하는 데 동의합니다. 여기에는 다음이 포함되나 이에 국한되지 않습니다:

- 학생, 부모, 보호자 및 학교 직원의 개인정보
- 심리 평가 기록, 점수 및 보고서
- 평가 세션의 음성 및 영상 녹화물
- AI 생성 분석 및 보고서 초안
- 독점 평가 도구, 채점 알고리즘 및 임상 방법론
- 사업 정보, 고객 목록 및 상업적 조건

## 2. 의무

직원은 다음에 동의합니다:

a) 특정 역할에 필요한 범위 내에서만 개인정보에 접근합니다.
b) 권한 없이 개인정보를 공유, 복사, 다운로드, 인쇄 또는 전송하지 않습니다.
c) 임상 감독 또는 권한 있는 사례 협의 외에서는 식별 가능한 방식으로 개별 사례를 논의하지 않습니다.
d) ReMynd가 승인한 시스템 및 도구만을 평가 데이터 저장 또는 처리에 사용합니다.
e) 데이터 침해, 남용 또는 무단 접근이 의심되는 경우 즉시 컴플라이언스 책임자에게 보고합니다.
f) 필요한 모든 데이터 보호 교육을 이수합니다.
g) 미성년자 데이터로 작업할 때 아동 개인정보 보호 정책을 따릅니다.
h) 고용 또는 계약 종료 후 **3년간** 기밀 유지 의무를 유지합니다.

## 3. 위반의 결과

본 계약 위반은 다음을 초래할 수 있습니다:
- 해고를 포함한 징계 조치
- 위반으로 인한 손해에 대한 민사 책임
- 중국 법률에 따른 해당 형사 책임

## 4. 확인

직원은 다음을 확인합니다:
- 모든 적용 가능한 개인정보 및 보안 정책을 읽고 이해함
- 필요한 온보딩 데이터 보호 교육 이수
- 질문할 기회 있었음

---

**직원:**

이름: _______________________
역할: _______________________
서명: _______________________
날짜: _______________________

**ReMynd 대표:**

이름: _______________________
서명: _______________________
날짜: _______________________`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 15. Personal Information Protection Impact Assessment
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Personal Information Protection Impact Assessment",
    content_en: `# Personal Information Protection Impact Assessment (PIPIA)

**Document Version:** 1.0 (Draft)
**Assessment Scope:** RAOS Platform — Psychological Assessment Services
**Assessment Date:** [To be completed]
**Next Review:** [Annual]

---

## 1. What Is a PIPIA?

A Personal Information Protection Impact Assessment (PIPIA) is required under PIPL Article 55 before processing that involves:
- Sensitive personal information
- Information about minors
- Automated decision-making
- Cross-border transfers of personal information

ReMynd's processing activities trigger all four categories. This assessment must be completed and filed before processing commences.

## 2. Processing Activities in Scope

| Activity | Sensitive? | Minors? | AI/Automated? | Cross-Border? |
|----------|-----------|---------|--------------|--------------|
| Assessment questionnaire collection | Yes (psychological) | Yes (U14) | No | No |
| Scoring and analysis | Yes | Yes | Partially (AI assist) | No |
| Report generation | Yes | Yes | Partially (AI draft) | Yes (Google Docs) |
| AI intake analysis (DeepSeek) | Yes (anonymised) | Yes (anonymised) | Yes | No |
| Audio transcription (Groq) | Yes (biometric-adjacent) | Yes | Yes | Yes (USA) |
| Vision analysis (Gemini) | Yes | Yes | Yes | Yes (USA) |
| Cross-border file storage | Yes | Yes | No | Yes (USA/SG) |

## 3. Risk Identification

### Risk 1 — AI model training on children's data
**Likelihood:** Medium (requires vendor confirmation)
**Impact:** High (violation of PIPL, children's protections)
**Mitigation:** Contractual prohibition on all AI vendor DPAs; annual confirmation of compliance required.

### Risk 2 — Cross-border transfer without adequate security assessment
**Likelihood:** High (currently in progress)
**Impact:** Critical (regulatory action, fines)
**Mitigation:** Initiate CAC security assessment; implement SCCs with all cross-border vendors.

### Risk 3 — Audio recordings transferred to Groq without specific consent notice
**Likelihood:** High (recording consent form does not yet address Groq/USA)
**Impact:** High (PIPL consent requirement violation)
**Mitigation:** Update recording consent form; defer audio transcription service until consent updated.

### Risk 4 — Retention of audio recordings beyond necessary period
**Likelihood:** Low (1-year deletion policy in place)
**Impact:** Medium (unnecessary SPI retention)
**Mitigation:** Automated deletion pipeline for audio files at 1-year mark.

### Risk 5 — Parent free-text responses mentioning identifiable third parties sent to AI
**Likelihood:** Medium
**Impact:** Medium (third-party personal information in AI prompts)
**Mitigation:** Phase 2 — implement free-text scrubbing before AI submission.

### Risk 6 — Access control failure exposing multiple students' records
**Likelihood:** Low (RBAC implemented)
**Impact:** Critical
**Mitigation:** Quarterly access reviews; principle of least privilege; audit logging.

## 4. Risk Treatment Plan

| Risk | Owner | Target Date | Status |
|------|-------|-------------|--------|
| R1 — AI training prohibition | Compliance Officer | Ongoing | Contracts in place; confirmations pending |
| R2 — CAC security assessment | Legal | Q2 next year | Not started |
| R3 — Recording consent update | Compliance Officer | Urgent | In progress |
| R4 — Automated audio deletion | Engineering | Q1 | Not started |
| R5 — Free-text scrubbing | Engineering | Q2 | Deferred to Phase 2 |
| R6 — Access control review | IT | Quarterly | Active |

## 5. Assessment Conclusion

The RAOS platform processes high-risk personal information (sensitive data, minors, AI, cross-border). The risk level is **HIGH** before mitigation and **MEDIUM** after current controls are applied. Processing may proceed with the following conditions:
- Recording consent form must be updated before audio transcription is used clinically.
- CAC security assessment must be initiated within 90 days.
- Annual review of this PIPIA is mandatory.

## 6. Sign-Off

This PIPIA requires review and sign-off by:
- Compliance Officer
- Legal Counsel
- Senior Management

*[Signatures — to be completed upon legal review]*`,

    content_zh: `# 个人信息保护影响评估（PIPIA）

**文件版本：** 1.0（草稿）
**评估范围：** RAOS平台——心理评估服务
**评估日期：** [待完成]
**下次审查：** [每年]

---

## 1. 什么是PIPIA？

根据个保法第55条，在以下处理开始前须进行个人信息保护影响评估（PIPIA）：
- 敏感个人信息
- 未成年人信息
- 自动化决策
- 跨境传输个人信息

ReMynd的处理活动涉及上述所有四类。本评估须在处理开始前完成并存档。

## 2. 评估范围内的处理活动

| 活动 | 敏感？ | 未成年人？ | AI/自动化？ | 跨境？ |
|------|-------|----------|-----------|-------|
| 评估问卷收集 | 是（心理） | 是（14岁以下） | 否 | 否 |
| 评分和分析 | 是 | 是 | 部分（AI辅助） | 否 |
| 报告生成 | 是 | 是 | 部分（AI草稿） | 是（Google Docs） |
| AI接案分析（DeepSeek） | 是（匿名化） | 是（匿名化） | 是 | 否 |
| 音频转录（Groq） | 是（类生物特征） | 是 | 是 | 是（美国） |
| 视觉分析（Gemini） | 是 | 是 | 是 | 是（美国） |
| 跨境文件存储 | 是 | 是 | 否 | 是（美国/新加坡） |

## 3. 风险识别

### 风险1——AI使用儿童数据训练模型
**可能性：** 中（需供应商确认）
**影响：** 高（违反个保法、儿童保护条款）
**缓解：** 所有AI供应商数据处理协议中的合同禁止；需每年确认合规。

### 风险2——未进行充分安全评估的跨境传输
**可能性：** 高（目前正在进行中）
**影响：** 严重（监管行动、罚款）
**缓解：** 启动网信办安全评估；与所有跨境供应商实施标准合同条款。

### 风险3——未在特定同意通知下将录音传输至Groq
**可能性：** 高（录制同意书尚未涉及Groq/美国）
**影响：** 高（违反个保法同意要求）
**缓解：** 更新录制同意书；在更新同意前暂缓音频转录服务。

### 风险4——录音超过必要期限保留
**可能性：** 低（1年删除政策已到位）
**影响：** 中（不必要的敏感个人信息保留）
**缓解：** 为音频文件设置1年期自动删除流程。

### 风险5——家长自由文本答案中提及可识别第三方并发送给AI
**可能性：** 中
**影响：** 中（AI提示词中含第三方个人信息）
**缓解：** 第二阶段——在AI提交前实施自由文本清洗。

### 风险6——访问控制失败导致多名学生记录暴露
**可能性：** 低（已实施RBAC）
**影响：** 严重
**缓解：** 季度访问审查；最小权限原则；审计日志。

## 4. 风险处理计划

| 风险 | 责任人 | 目标日期 | 状态 |
|------|-------|---------|------|
| R1——AI训练禁止 | 合规官 | 持续 | 合同已到位；确认待定 |
| R2——网信办安全评估 | 法律 | 明年第二季度 | 未开始 |
| R3——录制同意更新 | 合规官 | 紧急 | 进行中 |
| R4——自动音频删除 | 工程 | 第一季度 | 未开始 |
| R5——自由文本清洗 | 工程 | 第二季度 | 推迟至第二阶段 |
| R6——访问控制审查 | IT | 季度 | 活跃 |

## 5. 评估结论

RAOS平台处理高风险个人信息（敏感数据、未成年人、AI、跨境）。缓解前风险级别为**高**，应用当前控制措施后为**中**。处理可在以下条件下进行：
- 在临床使用音频转录前必须更新录制同意书。
- 必须在90天内启动网信办安全评估。
- 本PIPIA必须每年审查。

## 6. 签字确认

本PIPIA需以下人员审查和签字：
- 合规官
- 法律顾问
- 高级管理层

*[签名——在法律审查后完成]*`,

    content_ko: `# 개인정보 보호 영향 평가 (PIPIA)

**문서 버전:** 1.0 (초안)
**평가 범위:** RAOS 플랫폼 — 심리 평가 서비스
**평가 날짜:** [작성 예정]
**다음 검토:** [연간]

---

## 1. PIPIA란?

개인정보 보호 영향 평가(PIPIA)는 다음을 포함하는 처리 전에 PIPL 제55조에 따라 필요합니다:
- 민감한 개인정보
- 미성년자 정보
- 자동화된 의사결정
- 개인정보의 국경 간 이전

ReMynd의 처리 활동은 네 가지 범주 모두를 포함합니다. 본 평가는 처리 시작 전에 완료되고 제출되어야 합니다.

## 2. 평가 범위 내 처리 활동

| 활동 | 민감? | 미성년자? | AI/자동화? | 국경 간? |
|------|------|---------|----------|---------|
| 평가 설문지 수집 | 예 (심리) | 예 (14세 미만) | 아니오 | 아니오 |
| 채점 및 분석 | 예 | 예 | 부분적 (AI 보조) | 아니오 |
| 보고서 생성 | 예 | 예 | 부분적 (AI 초안) | 예 (Google Docs) |
| AI 접수 분석 (DeepSeek) | 예 (익명화) | 예 (익명화) | 예 | 아니오 |
| 음성 전사 (Groq) | 예 (생체정보 유사) | 예 | 예 | 예 (미국) |
| 비전 분석 (Gemini) | 예 | 예 | 예 | 예 (미국) |
| 국경 간 파일 스토리지 | 예 | 예 | 아니오 | 예 (미국/싱가포르) |

## 3. 위험 식별

### 위험 1 — AI의 아동 데이터 모델 훈련
**가능성:** 보통 (벤더 확인 필요)
**영향:** 높음 (PIPL, 아동 보호 위반)
**완화:** 모든 AI 벤더 DPA의 계약적 금지; 연간 컴플라이언스 확인 필요.

### 위험 2 — 적절한 보안 평가 없는 국경 간 이전
**가능성:** 높음 (현재 진행 중)
**영향:** 심각 (규제 조치, 벌금)
**완화:** CAC 보안 평가 시작; 모든 국경 간 벤더와 SCC 구현.

### 위험 3 — 특정 동의 고지 없이 Groq으로 음성 녹음 이전
**가능성:** 높음 (녹화 동의서가 아직 Groq/미국을 다루지 않음)
**영향:** 높음 (PIPL 동의 요건 위반)
**완화:** 녹화 동의서 업데이트; 동의 업데이트까지 음성 전사 서비스 유예.

### 위험 4 — 필요 기간 초과 음성 녹음 보유
**가능성:** 낮음 (1년 삭제 정책 시행 중)
**영향:** 보통 (불필요한 SPI 보유)
**완화:** 1년 시점에 음성 파일 자동 삭제 파이프라인.

### 위험 5 — 식별 가능한 제3자가 언급된 부모 자유 텍스트 응답이 AI로 전송
**가능성:** 보통
**영향:** 보통 (AI 프롬프트의 제3자 개인정보)
**완화:** 2단계 — AI 제출 전 자유 텍스트 스크러빙 구현.

### 위험 6 — 접근 통제 실패로 여러 학생 기록 노출
**가능성:** 낮음 (RBAC 구현)
**영향:** 심각
**완화:** 분기별 접근 검토; 최소 권한 원칙; 감사 로그.

## 4. 위험 처리 계획

| 위험 | 담당자 | 목표 날짜 | 상태 |
|------|-------|---------|------|
| R1 — AI 훈련 금지 | 컴플라이언스 책임자 | 지속 | 계약 완료; 확인 대기 중 |
| R2 — CAC 보안 평가 | 법률 | 내년 2분기 | 미시작 |
| R3 — 녹화 동의 업데이트 | 컴플라이언스 책임자 | 긴급 | 진행 중 |
| R4 — 자동 오디오 삭제 | 엔지니어링 | 1분기 | 미시작 |
| R5 — 자유 텍스트 스크러빙 | 엔지니어링 | 2분기 | 2단계로 연기 |
| R6 — 접근 통제 검토 | IT | 분기별 | 활성 |

## 5. 평가 결론

RAOS 플랫폼은 고위험 개인정보(민감 데이터, 미성년자, AI, 국경 간)를 처리합니다. 완화 전 위험 수준은 **높음**이며 현재 통제 적용 후 **보통**입니다. 다음 조건으로 처리가 진행될 수 있습니다:
- 음성 전사를 임상적으로 사용하기 전에 녹화 동의서를 업데이트해야 합니다.
- 90일 내에 CAC 보안 평가를 시작해야 합니다.
- 본 PIPIA의 연간 검토는 필수입니다.

## 6. 서명

본 PIPIA는 다음의 검토 및 서명이 필요합니다:
- 컴플라이언스 책임자
- 법률 자문
- 고위 경영진

*[서명 — 법률 검토 후 완성]*`,
  },

  // ─────────────────────────────────────────────────────────────────
  // 16. Annual Minors' Information Compliance Audit
  // ─────────────────────────────────────────────────────────────────
  {
    name: "Annual Minors' Information Compliance Audit",
    content_en: `# Annual Minors' Information Compliance Audit

**Document Version:** 1.0 (Draft)
**Audit Period:** [Year]
**Audit Conducted By:** [Auditor Name / Role]
**Date:** [To be completed]

---

## Purpose

This audit verifies ReMynd's compliance with PIPL Article 31, the Provisions on the Protection of Children's Personal Information Online (PPCP), and ReMynd's own Children's Personal Information Protection Policy with respect to minors' information processed through RAOS.

This audit must be completed annually and filed with the Compliance Register.

---

## Section A — Consent Compliance

| Audit Item | Status | Evidence | Notes |
|-----------|--------|---------|-------|
| A1. Parent/guardian consent obtained for all active cases involving U14 students | ☐ Pass ☐ Fail ☐ N/A | Case consent records | |
| A2. Sensitive Personal Information Consent obtained separately for all U14 active cases | ☐ Pass ☐ Fail ☐ N/A | SPI consent records | |
| A3. Recording consent obtained for all cases with audio/video recordings | ☐ Pass ☐ Fail ☐ N/A | Recording consent log | |
| A4. Consent forms are current (no outdated version in use) | ☐ Pass ☐ Fail ☐ N/A | Version control log | |
| A5. Consent withdrawal requests actioned within required timeframe | ☐ Pass ☐ Fail ☐ N/A | Rights request register | |

## Section B — Data Minimisation

| Audit Item | Status | Evidence | Notes |
|-----------|--------|---------|-------|
| B1. Only necessary fields collected for assessment purposes | ☐ Pass ☐ Fail | Data inventory review | |
| B2. Student names replaced with case IDs in all AI prompts reviewed | ☐ Pass ☐ Fail | AI prompt audit sample | |
| B3. Student DOBs removed from all AI prompts reviewed | ☐ Pass ☐ Fail | AI prompt audit sample | |
| B4. No collection of prohibited data categories (home address, government ID) | ☐ Pass ☐ Fail | Data inventory review | |

## Section C — Access Controls

| Audit Item | Status | Evidence | Notes |
|-----------|--------|---------|-------|
| C1. Access to minors' records limited to authorised roles | ☐ Pass ☐ Fail | Access control review | |
| C2. No inappropriate access events in audit logs this period | ☐ Pass ☐ Fail | Security audit log review | |
| C3. All staff with access to minors' data have completed annual training | ☐ Pass ☐ Fail | Training records | |
| C4. All staff with access to minors' data have signed the Confidentiality Agreement | ☐ Pass ☐ Fail | HR records | |

## Section D — Retention and Deletion

| Audit Item | Status | Evidence | Notes |
|-----------|--------|---------|-------|
| D1. Audio/video recordings older than 1 year from case closure have been deleted | ☐ Pass ☐ Fail | Storage audit | |
| D2. Assessment records older than 7 years from case closure have been deleted | ☐ Pass ☐ Fail | Database audit | |
| D3. Deletion requests from guardians actioned within 15 business days | ☐ Pass ☐ Fail | Rights request register | |

## Section E — AI and Automated Processing

| Audit Item | Status | Evidence | Notes |
|-----------|--------|---------|-------|
| E1. All AI vendors have confirmed non-use of minors' data for training | ☐ Pass ☐ Fail | Vendor confirmations | |
| E2. All AI-generated content has been reviewed by a psychometrician before inclusion in reports | ☐ Pass ☐ Fail | Case record audit sample | |
| E3. Cross-border AI transfers have appropriate safeguards | ☐ Pass ☐ Fail | Contract review | |

## Section F — Incident Review

| Audit Item | Status | Evidence | Notes |
|-----------|--------|---------|-------|
| F1. No unresolved security incidents involving minors' data from the audit period | ☐ Pass ☐ Fail | Incident log | |
| F2. Any incidents have been notified to required parties within required timeframes | ☐ Pass ☐ Fail | Incident notification log | |

---

## Audit Summary

**Total Items:** [Auto-calculated]
**Pass:** ___
**Fail:** ___
**N/A:** ___

**Overall Compliance Status:** ☐ Compliant ☐ Non-Compliant ☐ Partially Compliant

**Remediation Actions Required:**
[List any failed items and the remediation plan with owner and deadline]

---

## Sign-Off

**Auditor:** _______________________  Date: _______________________
**Compliance Officer:** _______________________  Date: _______________________
**Senior Management:** _______________________  Date: _______________________`,

    content_zh: `# 年度未成年人信息合规审计

**文件版本：** 1.0（草稿）
**审计期间：** [年份]
**审计人员：** [审计员姓名/职务]
**日期：** [待完成]

---

## 目的

本审计核实ReMynd在通过RAOS处理未成年人信息方面对个保法第31条、《儿童个人信息网络保护规定》（PPCP）以及ReMynd自身《儿童个人信息保护政策》的遵守情况。

本审计须每年完成并归入合规登记册。

---

## A部分——同意合规

| 审计项目 | 状态 | 证据 | 备注 |
|---------|------|------|------|
| A1. 所有涉及14岁以下学生的活跃案例均已获得家长/监护人同意 | ☐ 通过 ☐ 未通过 ☐ 不适用 | 案例同意记录 | |
| A2. 所有14岁以下活跃案例均已单独获得敏感个人信息同意 | ☐ 通过 ☐ 未通过 ☐ 不适用 | 敏感信息同意记录 | |
| A3. 所有含录音/录像的案例均已获得录制同意 | ☐ 通过 ☐ 未通过 ☐ 不适用 | 录制同意日志 | |
| A4. 同意书为最新版本（无过期版本在用） | ☐ 通过 ☐ 未通过 ☐ 不适用 | 版本控制日志 | |
| A5. 同意撤回请求在规定时限内得到处理 | ☐ 通过 ☐ 未通过 ☐ 不适用 | 权利请求登记册 | |

## B部分——数据最小化

| 审计项目 | 状态 | 证据 | 备注 |
|---------|------|------|------|
| B1. 仅收集评估目的所必要的字段 | ☐ 通过 ☐ 未通过 | 数据清单审查 | |
| B2. 所审查的所有AI提示词中学生姓名已替换为案例ID | ☐ 通过 ☐ 未通过 | AI提示词审计样本 | |
| B3. 所审查的所有AI提示词中学生出生日期已删除 | ☐ 通过 ☐ 未通过 | AI提示词审计样本 | |
| B4. 无禁止数据类别的收集（家庭住址、政府ID） | ☐ 通过 ☐ 未通过 | 数据清单审查 | |

## C部分——访问控制

| 审计项目 | 状态 | 证据 | 备注 |
|---------|------|------|------|
| C1. 未成年人记录访问权限仅限于授权角色 | ☐ 通过 ☐ 未通过 | 访问控制审查 | |
| C2. 审计期间审计日志中无不当访问事件 | ☐ 通过 ☐ 未通过 | 安全审计日志审查 | |
| C3. 所有访问未成年人数据的工作人员已完成年度培训 | ☐ 通过 ☐ 未通过 | 培训记录 | |
| C4. 所有访问未成年人数据的工作人员已签署保密协议 | ☐ 通过 ☐ 未通过 | 人事记录 | |

## D部分——保留和删除

| 审计项目 | 状态 | 证据 | 备注 |
|---------|------|------|------|
| D1. 案例结案后超过1年的录音/录像已删除 | ☐ 通过 ☐ 未通过 | 存储审计 | |
| D2. 案例结案后超过7年的评估记录已删除 | ☐ 通过 ☐ 未通过 | 数据库审计 | |
| D3. 来自监护人的删除请求在15个工作日内得到处理 | ☐ 通过 ☐ 未通过 | 权利请求登记册 | |

## E部分——AI和自动化处理

| 审计项目 | 状态 | 证据 | 备注 |
|---------|------|------|------|
| E1. 所有AI供应商已确认不使用未成年人数据进行训练 | ☐ 通过 ☐ 未通过 | 供应商确认 | |
| E2. 所有AI生成内容在纳入报告前均已由心理测量师审查 | ☐ 通过 ☐ 未通过 | 案例记录审计样本 | |
| E3. 跨境AI传输有适当的保障措施 | ☐ 通过 ☐ 未通过 | 合同审查 | |

## F部分——事件审查

| 审计项目 | 状态 | 证据 | 备注 |
|---------|------|------|------|
| F1. 审计期间无涉及未成年人数据的未解决安全事件 | ☐ 通过 ☐ 未通过 | 事件日志 | |
| F2. 任何事件均在规定时限内通知了相关方 | ☐ 通过 ☐ 未通过 | 事件通知日志 | |

---

## 审计摘要

**总项目数：** [自动计算]
**通过：** ___
**未通过：** ___
**不适用：** ___

**整体合规状态：** ☐ 合规 ☐ 不合规 ☐ 部分合规

**需要的整改行动：**
[列出任何未通过项目及整改计划、责任人和截止日期]

---

## 签字确认

**审计员：** _______________________  日期：_______________________
**合规官：** _______________________  日期：_______________________
**高级管理层：** _______________________  日期：_______________________`,

    content_ko: `# 연간 미성년자 정보 컴플라이언스 감사

**문서 버전:** 1.0 (초안)
**감사 기간:** [연도]
**감사 수행자:** [감사인 이름/역할]
**날짜:** [작성 예정]

---

## 목적

본 감사는 RAOS를 통해 처리된 미성년자 정보에 관하여 PIPL 제31조, 아동 개인정보 온라인 보호 규정(PPCP) 및 ReMynd 자체 아동 개인정보 보호 정책에 대한 ReMynd의 준수를 확인합니다.

본 감사는 연간 완료되어 컴플라이언스 등록부에 제출되어야 합니다.

---

## A섹션 — 동의 컴플라이언스

| 감사 항목 | 상태 | 증거 | 비고 |
|---------|------|------|------|
| A1. 14세 미만 학생이 포함된 모든 활성 사례에 대해 부모/보호자 동의 획득 | ☐ 통과 ☐ 실패 ☐ 해당없음 | 사례 동의 기록 | |
| A2. 모든 14세 미만 활성 사례에 대해 민감한 개인정보 동의 별도 획득 | ☐ 통과 ☐ 실패 ☐ 해당없음 | SPI 동의 기록 | |
| A3. 음성/영상 녹화가 있는 모든 사례에 대해 녹화 동의 획득 | ☐ 통과 ☐ 실패 ☐ 해당없음 | 녹화 동의 로그 | |
| A4. 동의서가 최신 버전 (구버전 미사용) | ☐ 통과 ☐ 실패 ☐ 해당없음 | 버전 관리 로그 | |
| A5. 동의 철회 요청이 요구 기한 내에 처리됨 | ☐ 통과 ☐ 실패 ☐ 해당없음 | 권리 요청 등록부 | |

## B섹션 — 데이터 최소화

| 감사 항목 | 상태 | 증거 | 비고 |
|---------|------|------|------|
| B1. 평가 목적에 필요한 필드만 수집 | ☐ 통과 ☐ 실패 | 데이터 인벤토리 검토 | |
| B2. 검토된 모든 AI 프롬프트에서 학생 이름이 사례 ID로 교체됨 | ☐ 통과 ☐ 실패 | AI 프롬프트 감사 샘플 | |
| B3. 검토된 모든 AI 프롬프트에서 학생 생년월일 삭제됨 | ☐ 통과 ☐ 실패 | AI 프롬프트 감사 샘플 | |
| B4. 금지된 데이터 범주 수집 없음 (가정 주소, 정부 ID) | ☐ 통과 ☐ 실패 | 데이터 인벤토리 검토 | |

## C섹션 — 접근 통제

| 감사 항목 | 상태 | 증거 | 비고 |
|---------|------|------|------|
| C1. 미성년자 기록 접근이 권한 있는 역할로 제한됨 | ☐ 통과 ☐ 실패 | 접근 통제 검토 | |
| C2. 이 기간 감사 로그에 부적절한 접근 이벤트 없음 | ☐ 통과 ☐ 실패 | 보안 감사 로그 검토 | |
| C3. 미성년자 데이터에 접근하는 모든 직원이 연간 교육 이수 | ☐ 통과 ☐ 실패 | 교육 기록 | |
| C4. 미성년자 데이터에 접근하는 모든 직원이 기밀 유지 계약서 서명 | ☐ 통과 ☐ 실패 | 인사 기록 | |

## D섹션 — 보유 및 삭제

| 감사 항목 | 상태 | 증거 | 비고 |
|---------|------|------|------|
| D1. 사례 종료 후 1년 이상 경과한 음성/영상 녹화물 삭제됨 | ☐ 통과 ☐ 실패 | 스토리지 감사 | |
| D2. 사례 종료 후 7년 이상 경과한 평가 기록 삭제됨 | ☐ 통과 ☐ 실패 | 데이터베이스 감사 | |
| D3. 보호자의 삭제 요청이 15영업일 내에 처리됨 | ☐ 통과 ☐ 실패 | 권리 요청 등록부 | |

## E섹션 — AI 및 자동화 처리

| 감사 항목 | 상태 | 증거 | 비고 |
|---------|------|------|------|
| E1. 모든 AI 벤더가 미성년자 데이터를 훈련에 사용하지 않음을 확인함 | ☐ 통과 ☐ 실패 | 벤더 확인서 | |
| E2. 모든 AI 생성 내용이 보고서 포함 전 심리 측정사의 검토를 받음 | ☐ 통과 ☐ 실패 | 사례 기록 감사 샘플 | |
| E3. 국경 간 AI 이전에 적절한 보호 조치가 있음 | ☐ 통과 ☐ 실패 | 계약 검토 | |

## F섹션 — 사고 검토

| 감사 항목 | 상태 | 증거 | 비고 |
|---------|------|------|------|
| F1. 감사 기간 미성년자 데이터를 포함한 미해결 보안 사고 없음 | ☐ 통과 ☐ 실패 | 사고 로그 | |
| F2. 모든 사고가 요구 기한 내에 해당 당사자에게 통보됨 | ☐ 통과 ☐ 실패 | 사고 통보 로그 | |

---

## 감사 요약

**총 항목 수:** [자동 계산]
**통과:** ___
**실패:** ___
**해당없음:** ___

**전체 컴플라이언스 상태:** ☐ 준수 ☐ 미준수 ☐ 부분 준수

**필요한 시정 조치:**
[실패한 항목과 담당자 및 기한이 포함된 시정 계획 목록]

---

## 서명

**감사인:** _______________________  날짜: _______________________
**컴플라이언스 책임자:** _______________________  날짜: _______________________
**고위 경영진:** _______________________  날짜: _______________________`,
  },
];
