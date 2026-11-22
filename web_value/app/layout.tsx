import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'web_value · 贵州茅台财务数据',
  description: '展示贵州茅台的历史财务数据、分红送转与股本变化',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
