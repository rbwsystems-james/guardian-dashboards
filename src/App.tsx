import { Header } from './header/Header'
import { Performance } from './pages/Performance'
import { Service } from './pages/Service'
import { Shell } from './shell/Shell'
import { useDashState } from './state'

export default function App() {
  const state = useDashState()
  return (
    <Shell>
      <Header state={state} />
      <div className="px-4 pb-6 pt-2.5">{state.route === 'service' ? <Service state={state} /> : <Performance state={state} />}</div>
    </Shell>
  )
}
