import Lenis from '../node_modules/lenis/dist/lenis.mjs'
import gsap from '../node_modules/gsap/index.js'
import { ScrollTrigger } from '../node_modules/gsap/ScrollTrigger.js'

gsap.registerPlugin(ScrollTrigger)

const lenis = new Lenis({
  duration: 1.04,
  smoothWheel: true,
  syncTouch: true,
  touchMultiplier: 0.92,
  wheelMultiplier: 0.92,
})

lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})
gsap.ticker.lagSmoothing(0)

const panels = gsap.utils.toArray('[data-panel]')
const indicator = document.getElementById('slide-indicator')
const templateLabel = document.getElementById('slide-template-label')
const progressFill = document.getElementById('progress-fill')
const slideNavDots = document.getElementById('slide-nav-dots')
const jumpPanel = document.getElementById('jump-panel')
const jumpPanelBackdrop = document.getElementById('jump-panel-backdrop')
const jumpPanelList = document.getElementById('jump-panel-list')

const PANEL_STORY_END = '+=180%'
const PANEL_NAV_DURATION_S = 1.08

let activePanelIndex = 0
let jumpPanelOpen = false

setupSlideNavigation()
setupJumpPanel()
setupKeyboardControls()
setupHeroPanel()
setupSignalPanel()
setupSystemPanel()
setupComparePanel()
setupSpotlightPanel()
setupMarqueePanel()
setupMetricsPanel()
setupTimelinePanel()
setupFinalePanel()
setupAmbientMotion()
setActiveIndex(0)

window.addEventListener('resize', () => {
  ScrollTrigger.refresh()
})

window.addEventListener('load', () => {
  ScrollTrigger.refresh()
})

function setupSlideNavigation() {
  if (!slideNavDots || panels.length === 0) {
    return
  }

  const fragment = document.createDocumentFragment()

  panels.forEach((panel, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'slide-nav__dot'
    button.setAttribute('aria-label', `Go to slide ${String(index + 1).padStart(2, '0')}`)
    button.title = getPanelTemplateLabel(panel)
    button.addEventListener('click', () => {
      goToPanel(index)
    })
    fragment.appendChild(button)
  })

  slideNavDots.replaceChildren(fragment)
}

function setupJumpPanel() {
  if (!jumpPanel || !jumpPanelList || panels.length === 0) {
    return
  }

  const fragment = document.createDocumentFragment()

  panels.forEach((panel, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'jump-panel__item'
    button.setAttribute('aria-label', `Jump to ${getPanelTemplateLabel(panel)}`)
    button.innerHTML = `
      <span class="jump-panel__item-index">Slide ${String(index + 1).padStart(2, '0')}</span>
      <strong class="jump-panel__item-title">${getPanelTemplateLabel(panel)}</strong>
    `
    button.addEventListener('click', () => {
      closeJumpPanel()
      goToPanel(index)
    })
    fragment.appendChild(button)
  })

  jumpPanelList.replaceChildren(fragment)
  jumpPanelBackdrop?.addEventListener('click', closeJumpPanel)
}

function setupKeyboardControls() {
  window.addEventListener('keydown', handleKeyboardControls)
}

function handleKeyboardControls(event) {
  if (event.key === 'g' || event.key === 'G') {
    event.preventDefault()
    toggleJumpPanel()
    return
  }

  if (event.key === 'Escape' && jumpPanelOpen) {
    event.preventDefault()
    closeJumpPanel()
    return
  }

  if (jumpPanelOpen) {
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    goToPanel(0)
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    goToPanel(panels.length - 1)
    return
  }

  const nextKeys = new Set(['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Spacebar'])
  const previousKeys = new Set(['ArrowUp', 'ArrowLeft', 'PageUp'])

  if (!nextKeys.has(event.key) && !previousKeys.has(event.key)) {
    return
  }

  event.preventDefault()
  const direction = nextKeys.has(event.key) ? 1 : -1
  goToPanel(activePanelIndex + direction)
}

function goToPanel(index) {
  const targetIndex = clamp(index, 0, panels.length - 1)
  const targetPanel = panels[targetIndex]
  if (!targetPanel) {
    return
  }

  lenis.scrollTo(targetPanel, {
    duration: PANEL_NAV_DURATION_S,
    easing: (value) => 1 - Math.pow(1 - value, 4),
    force: true,
    lock: true,
  })
}

function createPanelStory(panel, buildTimeline, { end = PANEL_STORY_END } = {}) {
  if (!panel) {
    return null
  }

  const panelIndex = panels.indexOf(panel)

  const timeline = gsap.timeline({
    defaults: {
      ease: 'power3.out',
    },
    scrollTrigger: {
      trigger: panel,
      start: 'top top',
      end,
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onEnter: () => setActiveIndex(panelIndex),
      onEnterBack: () => setActiveIndex(panelIndex),
    },
  })

  buildTimeline(timeline, panel)
  return timeline
}

function setupHeroPanel() {
  const panel = document.querySelector('.panel-hero')
  if (!panel) {
    return
  }

  const copy = panel.querySelector('.hero-copy')
  const orbit = panel.querySelector('.hero-orbit')
  const revealItems = panel.querySelectorAll('.eyebrow, .headline, .lead, .hero-tags span')
  const rings = panel.querySelectorAll('.hero-ring')
  const orbs = panel.querySelectorAll('.orb')
  const grid = panel.querySelector('.grid-plane')

  gsap.set(revealItems, {
    opacity: 0,
    y: 42,
  })
  gsap.set(rings, {
    opacity: 0,
    scale: 0.82,
  })
  gsap.set(orbs, {
    opacity: 0,
    scale: 0.88,
  })
  gsap.set(grid, {
    opacity: 0.16,
    yPercent: 10,
  })

  createPanelStory(panel, (timeline) => {
    timeline
      .to(revealItems, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.7,
      }, 0)
      .to(rings, {
        opacity: 0.72,
        scale: 1,
        stagger: 0.14,
        duration: 0.7,
      }, 0.08)
      .to(orbs, {
        opacity: 1,
        scale: 1,
        stagger: 0.08,
        duration: 0.7,
      }, 0.14)
      .to(copy, {
        yPercent: -10,
        duration: 1,
        ease: 'none',
      }, 0)
      .to(orbit, {
        yPercent: 12,
        duration: 1,
        ease: 'none',
      }, 0)
      .to(grid, {
        opacity: 0.36,
        yPercent: -12,
        duration: 1,
        ease: 'none',
      }, 0.08)
  })
}

function setupSignalPanel() {
  const panel = document.querySelector('.panel-signal')
  if (!panel) {
    return
  }

  const bars = panel.querySelectorAll('.signal-meter__bars span')
  const cards = panel.querySelectorAll('.stat-card')
  const copy = panel.querySelectorAll('.section-copy > *')

  gsap.set(copy, { opacity: 0, x: -36 })
  gsap.set(cards, {
    opacity: 0,
    y: 68,
    rotateX: -12,
    transformOrigin: 'center top',
  })
  gsap.set(bars, {
    scaleY: 0.18,
    opacity: 0.3,
    transformOrigin: 'center bottom',
  })

  createPanelStory(panel, (timeline) => {
    timeline
      .to(copy, {
        opacity: 1,
        x: 0,
        stagger: 0.08,
        duration: 0.5,
      }, 0)
      .to(bars, {
        scaleY: (index) => 0.45 + index * 0.12,
        opacity: 1,
        stagger: 0.08,
        duration: 0.62,
      }, 0.14)
      .to(cards, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        stagger: 0.12,
        duration: 0.72,
      }, 0.2)
      .to(cards, {
        y: (index) => -10 - index * 4,
        z: (index) => index * 18,
        duration: 0.56,
      }, 0.62)
  })
}

function setupSystemPanel() {
  const panel = document.querySelector('.panel-system')
  if (!panel) {
    return
  }

  const copy = panel.querySelectorAll('.section-copy > *')
  const rail = panel.querySelector('.system-rail')
  const railItems = panel.querySelectorAll('.system-rail span')
  const tiles = panel.querySelectorAll('.system-tile')

  gsap.set(copy, { opacity: 0, y: 28 })
  gsap.set(railItems, {
    opacity: 0,
    xPercent: 16,
  })
  gsap.set(tiles, {
    opacity: 0,
    y: 50,
    clipPath: 'inset(0 0 26% 0)',
  })

  createPanelStory(panel, (timeline) => {
    timeline
      .to(copy, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.5,
      }, 0)
      .to(railItems, {
        opacity: 1,
        xPercent: 0,
        stagger: 0.08,
        duration: 0.42,
      }, 0.12)
      .to(tiles, {
        opacity: 1,
        y: 0,
        clipPath: 'inset(0 0 0% 0)',
        stagger: 0.09,
        duration: 0.58,
      }, 0.2)
      .to(rail, {
        xPercent: -14,
        duration: 0.8,
        ease: 'none',
      }, 0.24)
  })
}

function setupComparePanel() {
  const panel = document.querySelector('.panel-compare')
  if (!panel) {
    return
  }

  const copy = panel.querySelectorAll('.section-copy > *')
  const beforePanel = panel.querySelector('.compare-panel-before')
  const afterPanel = panel.querySelector('.compare-panel-after')
  const divider = panel.querySelector('.compare-divider')

  gsap.set(copy, { opacity: 0, y: 28 })
  gsap.set(beforePanel, {
    opacity: 0,
    x: -72,
    clipPath: 'inset(0 22% 0 0)',
  })
  gsap.set(afterPanel, {
    opacity: 0,
    x: 72,
    clipPath: 'inset(0 0 0 22%)',
  })
  gsap.set(divider, {
    opacity: 0,
    scaleY: 0.08,
    transformOrigin: 'center center',
  })

  createPanelStory(panel, (timeline) => {
    timeline
      .to(copy, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.5,
      }, 0)
      .to(beforePanel, {
        opacity: 1,
        x: 0,
        clipPath: 'inset(0 0 0 0)',
        duration: 0.56,
      }, 0.16)
      .to(divider, {
        opacity: 1,
        scaleY: 1,
        duration: 0.36,
      }, 0.28)
      .to(afterPanel, {
        opacity: 1,
        x: 0,
        clipPath: 'inset(0 0 0 0)',
        duration: 0.56,
      }, 0.34)
  })
}

function setupSpotlightPanel() {
  const panel = document.querySelector('.panel-spotlight')
  if (!panel) {
    return
  }

  const copy = panel.querySelectorAll('.section-copy > *')
  const cards = panel.querySelectorAll('[data-spotlight-card]')
  const spotlightState = { index: 0 }

  gsap.set(copy, { opacity: 0, y: 28 })
  gsap.set(cards, {
    opacity: 0,
    y: 44,
    scale: 0.95,
  })

  createPanelStory(panel, (timeline) => {
    timeline
      .to(copy, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.5,
      }, 0)
      .to(cards, {
        opacity: 1,
        y: 0,
        scale: 1,
        stagger: 0.08,
        duration: 0.52,
      }, 0.16)
      .to(spotlightState, {
        index: cards.length - 0.001,
        duration: 0.62,
        ease: 'none',
        onUpdate: () => {
          focusSpotlightCard(cards, Math.min(cards.length - 1, Math.floor(spotlightState.index)))
        },
      }, 0.36)
  })
}

function setupMarqueePanel() {
  const panel = document.querySelector('.panel-marquee')
  if (!panel) {
    return
  }

  const copy = panel.querySelectorAll('.section-copy > *')
  const track = panel.querySelector('.marquee-track')
  const chips = panel.querySelectorAll('.marquee-chip')

  gsap.set(copy, { opacity: 0, y: 28 })
  gsap.set(chips, {
    opacity: 0,
    y: 28,
  })

  createPanelStory(panel, (timeline) => {
    timeline
      .to(copy, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.48,
      }, 0)
      .fromTo(track, {
        xPercent: 0,
      }, {
        xPercent: -18,
        duration: 1,
        ease: 'none',
      }, 0.08)
      .to(chips, {
        opacity: 1,
        y: 0,
        stagger: 0.06,
        duration: 0.38,
      }, 0.26)
  })
}

function setupMetricsPanel() {
  const panel = document.querySelector('.panel-metrics')
  if (!panel) {
    return
  }

  const copy = panel.querySelectorAll('.section-copy > *')
  const cards = panel.querySelectorAll('.metric-card')
  const values = panel.querySelectorAll('[data-metric-target]')
  const metricState = { reveal: 0 }

  gsap.set(copy, { opacity: 0, y: 28 })
  gsap.set(cards, {
    opacity: 0,
    y: 46,
    scale: 0.96,
  })

  createPanelStory(panel, (timeline) => {
    timeline
      .to(copy, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.5,
      }, 0)
      .to(cards, {
        opacity: 1,
        y: 0,
        scale: 1,
        stagger: 0.1,
        duration: 0.54,
      }, 0.16)
      .to(metricState, {
        reveal: 1,
        duration: 0.22,
        ease: 'none',
        onStart: () => animateMetricValues(values),
      }, 0.36)
  })
}

function setupTimelinePanel() {
  const panel = document.querySelector('.panel-timeline')
  if (!panel) {
    return
  }

  const copy = panel.querySelectorAll('.section-copy > *')
  const steps = panel.querySelectorAll('[data-timeline-step]')
  const timelineState = { index: 0 }

  gsap.set(copy, { opacity: 0, y: 28 })
  gsap.set(steps, {
    opacity: 0,
    x: 34,
  })

  createPanelStory(panel, (timeline) => {
    timeline
      .to(copy, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.48,
      }, 0)
      .to(steps, {
        opacity: 1,
        x: 0,
        stagger: 0.08,
        duration: 0.48,
      }, 0.16)
      .to(timelineState, {
        index: steps.length - 0.001,
        duration: 0.62,
        ease: 'none',
        onUpdate: () => {
          focusTimelineStep(steps, Math.min(steps.length - 1, Math.floor(timelineState.index)))
        },
      }, 0.34)
  })
}

function setupFinalePanel() {
  const panel = document.querySelector('.panel-finale')
  if (!panel) {
    return
  }

  const copy = panel.querySelectorAll('.section-copy > *')
  const chips = panel.querySelectorAll('.finale-chips span')
  const banner = panel.querySelector('.finale-banner')
  const aura = panel.querySelector('.finale-aura')

  gsap.set(copy, { opacity: 0, y: 28 })
  gsap.set(chips, {
    opacity: 0,
    y: 32,
    scale: 0.92,
  })
  gsap.set(banner, {
    opacity: 0,
    y: 44,
    clipPath: 'inset(0 100% 0 0)',
  })
  gsap.set(aura, {
    opacity: 0,
    scale: 0.76,
  })

  createPanelStory(panel, (timeline) => {
    timeline
      .to(copy, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.5,
      }, 0)
      .to(chips, {
        opacity: 1,
        y: 0,
        scale: 1,
        stagger: 0.08,
        duration: 0.48,
        ease: 'back.out(1.3)',
      }, 0.12)
      .to(banner, {
        opacity: 1,
        y: 0,
        clipPath: 'inset(0 0% 0 0)',
        duration: 0.82,
      }, 0.22)
      .to(aura, {
        opacity: 1,
        scale: 1,
        duration: 0.7,
      }, 0.3)
  })
}

function setupAmbientMotion() {
  gsap.to('.orb-a', {
    xPercent: 18,
    yPercent: -16,
    scale: 1.1,
    duration: 4.8,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.orb-b', {
    xPercent: -14,
    yPercent: 10,
    scale: 0.92,
    duration: 5.6,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.orb-c', {
    yPercent: -14,
    rotate: 10,
    duration: 6.2,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.float-card', {
    y: -14,
    duration: 2.4,
    stagger: 0.16,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.grid-plane', {
    backgroundPosition: '0px 120px',
    duration: 7,
    repeat: -1,
    ease: 'none',
  })

  gsap.to('.hero-ring-a', {
    rotate: 10,
    duration: 8,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.hero-ring-b', {
    rotate: -8,
    duration: 9,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.finale-aura', {
    yPercent: -8,
    xPercent: -4,
    duration: 6.5,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.compare-divider', {
    opacity: 0.78,
    duration: 1.4,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })

  gsap.to('.marquee-chip', {
    y: -10,
    stagger: 0.08,
    duration: 2.2,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  })
}

function setActiveIndex(index) {
  const panel = panels[index]
  if (!panel) {
    return
  }

  activePanelIndex = index
  const current = String(index + 1).padStart(2, '0')
  const total = String(panels.length).padStart(2, '0')

  if (indicator) {
    indicator.textContent = `${current} / ${total}`
  }

  if (templateLabel) {
    templateLabel.textContent = getPanelTemplateLabel(panel)
  }

  if (progressFill) {
    progressFill.style.height = `${((index + 1) / panels.length) * 100}%`
  }

  if (slideNavDots) {
    Array.from(slideNavDots.children).forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === index)
    })
  }

  if (jumpPanelList) {
    Array.from(jumpPanelList.children).forEach((item, itemIndex) => {
      item.classList.toggle('is-active', itemIndex === index)
    })
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

function getPanelTemplateLabel(panel) {
  const templateText = panel?.querySelector('.template-kicker')?.textContent?.trim() || ''
  if (!templateText) {
    return 'Slide'
  }

  const parts = templateText.split('/').map((part) => part.trim()).filter(Boolean)
  return parts.at(-1) || templateText
}

function toggleJumpPanel() {
  if (jumpPanelOpen) {
    closeJumpPanel()
    return
  }

  openJumpPanel()
}

function openJumpPanel() {
  if (!jumpPanel) {
    return
  }

  jumpPanelOpen = true
  jumpPanel.hidden = false
  jumpPanel.setAttribute('aria-hidden', 'false')
  if (jumpPanelBackdrop) {
    jumpPanelBackdrop.hidden = false
  }
}

function closeJumpPanel() {
  if (!jumpPanel) {
    return
  }

  jumpPanelOpen = false
  jumpPanel.hidden = true
  jumpPanel.setAttribute('aria-hidden', 'true')
  if (jumpPanelBackdrop) {
    jumpPanelBackdrop.hidden = true
  }
}

function focusSpotlightCard(cards, activeIndex) {
  cards.forEach((card, index) => {
    card.classList.toggle('is-active', index === activeIndex)
  })

  gsap.to(cards, {
    opacity: (index) => (index === activeIndex ? 1 : 0.42),
    y: (index) => (index === activeIndex ? -8 : 0),
    scale: (index) => (index === activeIndex ? 1.02 : 0.97),
    duration: 0.34,
    ease: 'power2.out',
    overwrite: true,
  })
}

function animateMetricValues(values) {
  values.forEach((valueNode) => {
    if (valueNode.dataset.metricAnimated === 'true') {
      return
    }

    valueNode.dataset.metricAnimated = 'true'
    const targetValue = Number(valueNode.dataset.metricTarget || '0')
    const state = { value: 0 }
    const hasFraction = !Number.isInteger(targetValue)

    gsap.to(state, {
      value: targetValue,
      duration: 1.1,
      ease: 'power3.out',
      onUpdate: () => {
        valueNode.textContent = hasFraction ? state.value.toFixed(1) : Math.round(state.value).toString()
      },
    })
  })
}

function focusTimelineStep(steps, activeIndex) {
  steps.forEach((step, index) => {
    step.classList.toggle('is-active', index === activeIndex)
  })

  gsap.to(steps, {
    opacity: (index) => (index === activeIndex ? 1 : 0.48),
    x: (index) => (index === activeIndex ? 10 : 0),
    duration: 0.32,
    ease: 'power2.out',
    overwrite: true,
  })
}
