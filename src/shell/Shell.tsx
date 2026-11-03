import type { ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBoxArchive,
  faBuilding,
  faBuildingColumns,
  faChartLine,
  faClock,
  faFile,
  faGaugeHigh,
  faGear,
  faKey,
  faRectangleList,
  faRightFromBracket,
  faSitemap,
  faTableColumns,
  faUser,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'
import logo from '../assets/guardian-cms-white.svg'

interface Item { label: string; icon: IconDefinition }

// Menu replicated from Guardian CMS, with the new Dashboard entry on top (selected).
const MENU: Item[] = [
  { label: 'Installations', icon: faSitemap },
  { label: 'Live Floor View', icon: faGaugeHigh },
  { label: 'Transactions', icon: faRectangleList },
  { label: 'Revenue', icon: faBuildingColumns },
  { label: 'Income Security', icon: faKey },
  { label: 'Kiosk', icon: faBoxArchive },
  { label: 'Sessions', icon: faClock },
  { label: 'Reports', icon: faFile },
  { label: 'Analysis', icon: faChartLine },
]

function MenuRow({ item, selected = false }: { item: Item; selected?: boolean }) {
  return (
    <div
      aria-current={selected ? 'page' : undefined}
      className={`relative flex h-10 select-none items-center justify-between border-t border-guardian-line/60 px-4 text-[14px] uppercase text-white ${
        selected ? 'bg-guardian-dark' : ''
      }`}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-1 bg-white" />}
      <span>{item.label}</span>
      <FontAwesomeIcon icon={item.icon} className="h-[14px] w-[14px] opacity-90" />
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="flex w-[210px] shrink-0 flex-col bg-guardian">
      <div className="flex h-[68px] items-center px-4">
        <img src={logo} alt="Guardian CMS" className="h-auto w-full" />
      </div>
      <nav className="flex flex-col" aria-label="Guardian CMS">
        <MenuRow item={{ label: 'Dashboard', icon: faTableColumns }} selected />
        {MENU.map((m) => (
          <MenuRow key={m.label} item={m} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col">
        <MenuRow item={{ label: 'Settings & Admin', icon: faGear }} />
        <div className="flex h-[41px] select-none items-center justify-between border-t border-guardian-line/60 px-4 text-[14px] text-white">
          <span>Log Out</span>
          <FontAwesomeIcon icon={faRightFromBracket} className="h-[14px] w-[14px] opacity-90" />
        </div>
      </div>
    </aside>
  )
}

function StatusBar() {
  return (
    <footer className="flex h-[41px] shrink-0 items-center justify-between bg-status px-4 text-[14px] text-white">
      <span className="flex items-center gap-2">
        <FontAwesomeIcon icon={faUser} className="h-[14px] w-[14px] text-[#9a9a9a]" />
        Radical Admin - (Super User) - System Admin (Operator)
      </span>
      <span className="flex items-center gap-2">
        <FontAwesomeIcon icon={faBuilding} className="h-[14px] w-[14px] text-[#9a9a9a]" />
        <span>Guardian CMS – RBW Systems</span>
        <span className="text-[11px] text-[#b5b5b5]">Version 6.4.1.555 #v6.4.1.552</span>
      </span>
    </footer>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full bg-white p-1">
      <div className="flex h-full overflow-hidden rounded-md">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-page">{children}</main>
          <StatusBar />
        </div>
      </div>
    </div>
  )
}
