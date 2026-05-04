export const FRAMEWORK_PLAYBOOK = {
  focus: 'web',
  implementation_modules: [
    'springai-front-react/src/pages',
    'springai-front-react/src/components',
    'src/main/java/org/example/springai_learn'
  ],
  platform_constraints: {
    desktop: ['multi-column layout', 'keyboard-first navigation'],
    mobile: ['thumb-first controls', 'reduced visual density']
  },
  native_capabilities: ['provider', 'offline', 'filesystem', 'push', 'share'],
  validation_surfaces: [
    'src/App.jsx routing shell',
    'src/styles/global.css token entry',
    'src/components/Chat/ChatInput.jsx input states',
    'src/components/Sidebar/ChatSidebar.jsx navigation states'
  ],
  delivery_evidence: [
    'output/Lovemaster-frontend-runtime.json',
    'output/Lovemaster-backend-runtime.json',
    'output/frontend/index.html'
  ]
};

export const FRAMEWORK_SIGNALS = {
  'framework signals': 'provider, offline, filesystem, push, share',
  frameworkSignals: ['provider', 'offline', 'filesystem', 'push', 'share'],
  platformDiffHandling: ['desktop', 'mobile'],
  validationSurfaces: FRAMEWORK_PLAYBOOK.validation_surfaces,
  deliveryEvidence: FRAMEWORK_PLAYBOOK.delivery_evidence
};

export function mountFrameworkPlaybookSignals() {
  if (typeof window !== 'undefined') {
    window.__LOVEMASTER_FRAMEWORK_PLAYBOOK__ = FRAMEWORK_PLAYBOOK;
    window.__LOVEMASTER_FRAMEWORK_SIGNALS__ = FRAMEWORK_SIGNALS;
  }
}
