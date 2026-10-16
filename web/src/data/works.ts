// 个人说明数据（双语）。每个板块点击后展开对应内容。
// 纯数据驱动：增删板块 / 作品只改本文件，Works.jsx 仅负责渲染。
//
// 板块字段：
//   id        唯一标识（用于 framer layoutId 共享元素动画）
//   title     板块标题
//   tagline   索引行右侧一句话
//   items[]   扁平作品列表：{ name, meta?, tags?, link? }
//             点击 item 弹出全屏详情，可补充可选媒体/文案字段：
//             { image?, video?, year?, desc? }（缺省时媒体用占位、简介回退 meta/标签）
//   groups[]  分组作品（与 items 二选一）：{ heading, items: string[] }
//   awards[]  奖项 chip（可选）
//   footer    底部技术/备注一行（可选）

export interface WorkListItem {
  name: string
  meta?: string
  tags?: string[]
  link?: string
  slug?: string
}

export interface WorkGroup {
  heading: string
  items: string[]
}

export interface WorkSection {
  id: string
  title: string
  tagline: string
  items?: WorkListItem[]
  groups?: WorkGroup[]
  awards?: string[]
  footer?: string
}

export interface WorksLang {
  title: string
  closeLabel: string
  openLabel: string
  hint: string
  awardsLabel: string
  visitLabel: string
  detailPlaceholder: string
  phImageLabel: string
  phButtonLabel: string
  countLabel: (n: number) => string
  sections: WorkSection[]
}

export const WORKS: Record<'zh' | 'en', WorksLang> = {
  zh: {
    title: '个人说明',
    closeLabel: '返回',
    openLabel: '展开内容',
    hint: '继续下滑',
    awardsLabel: '获奖',
    visitLabel: '访问作品',
    detailPlaceholder: '点击条目查看完整内容',
    phImageLabel: '个人简历内容',
    phButtonLabel: '无外部链接',
    countLabel: (n) => `${n} 件作品`,
    sections: [
      {
        id: 'self-evaluation',
        title: '自我评价',
        tagline: '踏实认真 · 乐于钻研',
        items: [
          { name: '我的做事方式', meta: '个人特质', slug: 'self-evaluation' },
        ],
        footer: '有计划 · 有责任心 · 愿意配合团队',
      },
      {
        id: 'lab-understanding',
        title: '对实验室的认识',
        tagline: '四个部门 · 相互联系 · 共同成长',
        items: [
          { name: '我理解的虚拟仿真实验室', meta: '实验室认知', slug: 'lab-understanding' },
        ],
        footer: '建模 · UE · 云渲染 · 人工智能',
      },
      {
        id: 'department-choice',
        title: '选择意向组别的原因',
        tagline: '人工智能部 · AIGC · 智能交互',
        items: [
          { name: '为什么选择人工智能部', meta: '报名动机', slug: 'department-choice' },
        ],
        footer: '兴趣驱动 · 顺应技术浪潮 · 持续提升能力',
      },
    ],
  },
  en: {
    title: 'About',
    closeLabel: 'Back',
    openLabel: 'Read more',
    hint: 'Keep scrolling',
    awardsLabel: 'Awards',
    visitLabel: 'Visit site',
    detailPlaceholder: 'Open an item to read the full résumé text',
    phImageLabel: 'Résumé content',
    phButtonLabel: 'No external link',
    countLabel: (n) => `${n} works`,
    sections: [
      {
        id: 'self-evaluation',
        title: 'Self Evaluation',
        tagline: 'Steady · Curious · Responsible',
        items: [
          { name: 'How I work', meta: 'Personal qualities', slug: 'self-evaluation' },
        ],
        footer: 'Plan · Take responsibility · Work with others',
      },
      {
        id: 'lab-understanding',
        title: 'About the Laboratory',
        tagline: 'Four departments · One connected system',
        items: [
          { name: 'How I understand the lab', meta: 'Lab perspective', slug: 'lab-understanding' },
        ],
        footer: 'Modeling · UE · Cloud rendering · AI',
      },
      {
        id: 'department-choice',
        title: 'Why AI Department',
        tagline: 'AIGC · Intelligent Interaction · Growth',
        items: [
          { name: 'Why I chose the AI department', meta: 'Motivation', slug: 'department-choice' },
        ],
        footer: 'Curiosity · New technology · Continuous improvement',
      },
    ],
  },
}

// 统计一个板块的作品数（items 或 groups 求和），用于索引行 hover 显示
export function sectionCount(section: WorkSection): number {
  if (section.items) return section.items.length
  if (section.groups) return section.groups.reduce((n, g) => n + g.items.length, 0)
  return 0
}
