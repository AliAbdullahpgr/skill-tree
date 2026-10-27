import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SkillWeave — Your Skill Atlas', icons: { icon: '/brand/skillweave-icon.png', apple: '/brand/skillweave-icon.png' }, description: 'An ancient atlas. An unfinished legend. Chart your real-world mastery in an animated RPG skill tree.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
