import { motion } from 'framer-motion'
import { ZooopLogo } from './ZooopLogo'
import { SOCIAL_ICONS } from './SocialIcons'
import { FOCUS_POINTS } from '../data/focusPoints'

// 履历数据（双语）。英文为译稿，可按需润色。
interface ResumeGroup {
  heading?: string
  logo?: string
  logoImg?: string
  sub?: string
  link?: string
  items?: string[]
  links?: { id: string; label: string; href: string }[]
}
interface ResumeEntry {
  period: string
  place: string
  role?: string
  logo?: { src: string; alt: string }
  points?: string[]
  groups?: ResumeGroup[]
}
const RESUME: Record<'en' | 'zh', { title: string; entries: ResumeEntry[] }> = {
  en: {
    title: 'Résumé',
    entries: [
      {
        period: '2026 – Now',
        place: 'Automation 2606',
        role: 'Automation student',
        points: ['A hardworking university student studying advanced mathematics, C programming, and engineering drawing.'],
      },
      {
        period: '2026 – Now',
        place: 'Artificial Intelligence',
        role: 'Learning direction',
        points: [
          'Exploring AI tools, AIGC, intelligent interaction, and data-driven optimization.',
          'Interested in turning creative ideas into useful experiments.',
        ],
      },
      {
        period: '2026 – Now',
        place: 'Virtual Simulation Lab',
        role: 'Applicant · AI Department',
        points: [
          'Interested in AIGC, smart interaction, and making virtual projects more expressive.',
          'Ready to learn with the team and contribute time to laboratory projects.',
        ],
      },
      {
        period: 'Always',
        place: 'How I work',
        role: 'Steady · curious · responsible',
        points: [
          'I make plans, follow milestones, and finish assigned work on time.',
          'When I meet a problem, I research, ask AI, try things, and then ask teachers or seniors.',
        ],
      },
      {
        period: 'Beyond class',
        place: 'Table tennis',
        role: 'Personal interest',
        points: ['A simple way to stay active, focused, and playful.'],
      },
    ],
  },
  zh: {
    title: 'Résumé',
    entries: [
      {
        period: '2026 – 至今',
        place: '自动化2606班',
        role: '自动化专业学生',
        points: ['一个正在学高数、C 语言和工程制图的苦命大学生。'],
      },
      {
        period: '2026 – 至今',
        place: '人工智能方向',
        role: '学习方向',
        points: [
          '关注 AI 工具、AIGC、智能交互和数据驱动优化。',
          '希望把有趣的想法一步步做成实用的小实验。',
        ],
      },
      {
        period: '2026 – 至今',
        place: '计算机学院虚拟仿真实验室',
        role: '报名意向 · 人工智能部',
        points: [
          '对 AIGC、智能交互，以及让虚拟项目更有表现力感兴趣。',
          '愿意和团队一起学习，并投入时间参与实验室项目。',
        ],
      },
      {
        period: '一直如此',
        place: '做事方式',
        role: '踏实 · 乐于钻研 · 有责任心',
        points: [
          '做事有计划，按时间节点推进并完成任务。',
          '遇到问题会先查资料、问 AI、动手尝试，再向老师和学长学姐请教。',
        ],
      },
      {
        period: '课余时间',
        place: '乒乓球',
        role: '个人特长',
        points: ['保持活力、专注和一点轻松感。'],
      },
    ],
  },
}

// 履历条目依次对应 glb 里的聚焦锚点（相机停靠点），顺序须与 entries 一致。
// 名单是唯一真源，见 data/focusPoints.ts（Scene.tsx 也从那里取）。
const POINT_ORDER = FOCUS_POINTS

const EASE = [0.22, 1, 0.36, 1]
const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}
const itemV = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
}

function Group({ group }: { group: ResumeGroup }) {
  const heading =
    group.logo === 'zooop' ? (
      <a
        className="zooop-logo-link"
        href={group.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="ZOOOP"
      >
        <ZooopLogo className="zooop-logo" animated />
      </a>
    ) : group.link ? (
      <a className="about-link" href={group.link} target="_blank" rel="noopener noreferrer">
        {group.heading}
      </a>
    ) : (
      <span>{group.heading}</span>
    )

  return (
    <motion.div className="tl-group" variants={itemV}>
      <div className="tl-group-head">
        {group.logoImg && (
          <span className="tl-group-logo">
            <img src={group.logoImg} alt={group.heading || ''} loading="lazy" />
          </span>
        )}
        {heading}
        {group.sub && <span className="tl-group-sub">{group.sub}</span>}
      </div>
      {group.items && (
        <ul className="tl-points">
          {group.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
      {group.links && (
        <div className="tl-logos">
          {group.links.map((l) => {
            const Icon = SOCIAL_ICONS[l.id as keyof typeof SOCIAL_ICONS]
            return (
              <a
                key={l.id}
                className="tl-logo"
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={l.label}
                title={l.label}
              >
                <Icon />
              </a>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function Entry({ entry, index }: { entry: ResumeEntry; index: number }) {
  return (
    <motion.div
      className="tl-entry"
      data-point={POINT_ORDER[index]}
      variants={containerV}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
    >
      <motion.span className="tl-dot" variants={itemV} aria-hidden="true" />
      {/* tl-body 包住文字内容（点保持在外做时间轴标记）：移动端可给它加卡片衬底，
          且它紧贴内容高度，不含 tl-entry 用于排布的大 padding。
          用普通 div（非 motion）：framer 变体经 React context 穿透它，叶子元素仍是
          tl-entry 的直接 stagger 子级，入场动画与包裹前完全一致。 */}
      <div className="tl-body">
        <motion.div className="tl-period" variants={itemV}>
          {entry.period}
        </motion.div>
        <motion.div className="tl-head" variants={itemV}>
          {entry.logo && (
            <span className="tl-logo-chip">
              <img src={entry.logo.src} alt={entry.logo.alt} loading="lazy" />
            </span>
          )}
          <h3 className="tl-place">{entry.place}</h3>
        </motion.div>
        {entry.role && (
          <motion.div className="tl-role" variants={itemV}>
            {entry.role}
          </motion.div>
        )}
        {entry.points && (
          <motion.ul className="tl-points" variants={itemV}>
            {entry.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </motion.ul>
        )}
        {entry.groups && entry.groups.map((g, i) => <Group key={i} group={g} />)}
      </div>
    </motion.div>
  )
}

export default function Resume({ lang }: { lang: 'en' | 'zh' }) {
  const data = RESUME[lang]
  return (
    <section className="resume" lang={lang}>
      <motion.h2
        className="resume-title"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        {data.title}
      </motion.h2>
      <div className="timeline">
        {data.entries.map((e, i) => (
          <Entry key={i} entry={e} index={i} />
        ))}
      </div>
    </section>
  )
}
