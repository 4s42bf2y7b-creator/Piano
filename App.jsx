import { useState, useEffect, useRef, useCallback } from 'react'
import BgStars      from './components/BgStars'
import HomeScreen   from './components/HomeScreen'
import PlayScreen   from './components/PlayScreen'
import ResultScreen from './components/ResultScreen'
import { getSongLevel, setSongLevel, getStreak, setStreak, getLastPlay, setLastPlay } from './utils/storage'

export default function App() {
  const [screen,      setScreen]      = useState('home')
  const [selectedSong,setSelectedSong]= useState(null)
  const [currentLevel,setCurrentLevel]= useState(0)
  const [streak,      setStreakState]  = useState(() => getStreak())
  const [resultData,  setResultData]   = useState(null)
  const [midiStatus,  setMidiStatus]   = useState('init')
  const onNoteRef = useRef(null)

  // ── MIDI ──
  const initMidi = useCallback(() => {
    if (!navigator.requestMIDIAccess) {
      setMidiStatus('unavailable')
      return
    }
    setMidiStatus('init')

    // Timeout fallback — if no response in 2s, mark unavailable
    const timeout = setTimeout(() => setMidiStatus('unavailable'), 2000)

    navigator.requestMIDIAccess().then(access => {
      clearTimeout(timeout)
      const connect = () => {
        let found = false
        for (const inp of access.inputs.values()) {
          inp.onmidimessage = e => onNoteRef.current?.(e)
          found = true
        }
        setMidiStatus(found ? 'connected' : 'waiting')
      }
      connect()
      access.onstatechange = connect
    }).catch(() => {
      clearTimeout(timeout)
      setMidiStatus('unavailable')
    })
  }, [])

  useEffect(() => { initMidi() }, [initMidi])

  // ── nav ──
  const handleSelect = (song) => {
    setSelectedSong(song)
    setCurrentLevel(getSongLevel(song.id))
    setScreen('play')
  }

  const handleEnd = (data) => {
    // level up
    if (data.accuracy >= 80 && data.level < 2) {
      setSongLevel(data.songId, data.level + 1)
    }
    // streak
    const today = new Date().toDateString()
    const last  = getLastPlay()
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      const newStreak = last === yesterday ? streak + 1 : 1
      setStreak(newStreak)
      setStreakState(newStreak)
      setLastPlay(today)
    }
    setResultData(data)
    setScreen('result')
  }

  const goHome = () => setScreen('home')

  const playAgain = () => {
    setCurrentLevel(getSongLevel(selectedSong.id))
    setScreen('play')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D0D1A', overflow: 'hidden' }}>
      <BgStars />

      {screen === 'home' && (
        <HomeScreen
          streak={streak}
          midiStatus={midiStatus}
          onSelect={handleSelect}
          onRetryMidi={initMidi}
        />
      )}

      {screen === 'play' && selectedSong && (
        <PlayScreen
          key={`${selectedSong.id}-${currentLevel}`}
          song={selectedSong}
          level={currentLevel}
          onNoteRef={onNoteRef}
          onBack={goHome}
          onEnd={handleEnd}
        />
      )}

      {screen === 'result' && resultData && (
        <ResultScreen
          data={resultData}
          song={selectedSong}
          onPlayAgain={playAgain}
          onHome={goHome}
        />
      )}
    </div>
  )
}
