class KeyoIdentitiesModule extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.orgToken = null;
    this.identities = [];
    this.loading = false;
    this.error = '';
    this.modalOpen = false;
    this.activeIdentity = null;
    this.modalError = '';
    this.modalSaving = false;
    this.modalForm = {
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      metadataText: '{}',
    };
    this.modalOriginal = {
      email: '',
      phone: '',
    };
    this.deviceStorageKey = 'keyoIdentitiesDevices';
    this.devices = [];
    this.deviceSelectorOpen = false;
    this.selectedDeviceId = '';
    this.deviceForm = {
      serial_number: '',
      device_id: '',
      name: '',
    };
    this.deviceFormExpanded = false;
    this.enrollLoading = false;
    this.accountInfoExpanded = true;
    this.enrollUserExpanded = false;
    this.enrollModalOpen = false;
    this.createModalOpen = false;
    this.createForm = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      metadataText: '',
    };
    this.createError = '';
    this.createLoading = false;
    this.createDeviceFormExpanded = false;
    this.globalScope = typeof globalThis === 'undefined' ? {} : globalThis;
    this.demoMode = this.loadDemoMode();
    const tokenAttr = this.dataset?.tokenUrl;
    const baseAttr = this.dataset?.keyoBase;
    const globalWin = this.globalScope;
    this.tokenEndpoint = tokenAttr || '/api/token';
    this.keyoBase = baseAttr || globalWin?.KI_KEYO_BASE || globalWin?.location?.origin || '';
    this.storageKey = 'keyoIdentitiesOrgToken';
    this.tokenExpiryKey = 'keyoIdentitiesOrgTokenExpiry';
    this.refreshingToken = false;
    this.lastViewKey = 'keyoIdentitiesLastView';
    this.lastDeviceKey = 'keyoIdentitiesLastDevice';
    this.defaultDeviceKey = 'keyoIdentitiesDefaultDevice';
    this.currentView = 'create'; // 'create', 'list', 'device-admin'
    this.panelOpen = false;
    this.resetSectionExpanded = false;
  }

  connectedCallback() {
    this.loadDevices();
    this.pruneExpiredToken();
    const storage = this.getStorage();
    const storedToken = storage?.getItem(this.storageKey);
    if (storedToken) {
      this.orgToken = storedToken;
      this.fetchIdentities();
      // Restore last view if authenticated
      const lastView = storage?.getItem(this.lastViewKey);
      if (lastView && ['create', 'list', 'device-admin'].includes(lastView)) {
        this.currentView = lastView;
      }
    } else {
      this.currentView = 'create'; // Default to create view when not authenticated
    }
    this.render();
  }

  detectBootstrap() {
    const win = this.globalScope;
    const doc =
      win?.document || (typeof document === 'undefined' ? null : document);
    if (win?.bootstrap) return true;
    if (doc?.querySelector('link[href*="bootstrap"]')) return true;
    return false;
  }

  setState(updates) {
    Object.assign(this, updates);
    // Persist view state changes
    if (updates.currentView) {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(this.lastViewKey, updates.currentView);
      }
    }
    this.render();
  }

  getStyles(useBootstrap) {
    const shared = `
      :host {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #1f2937;
        display: block;
        width: 100%;
      }
      .ki-card {
        width: min(960px, 100%);
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        padding: 24px 28px;
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
      }
      .ki-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      .ki-logout-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #6b7280;
        text-decoration: none;
        transition: color 0.2s ease;
        padding: 4px;
        margin-left: auto;
        align-self: flex-start;
      }
      .ki-logout-link:hover {
        color: #000000;
      }
      .ki-logout-text {
        font-size: 0.75em;
      }
      .ki-logout-link svg {
        display: block;
        width: 15px;
      }
      .ki-heading h1 {
        font-size: 1.5rem;
        margin: 0;
      }
      .ki-logo-container {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        align-self: flex-start;
        gap: 12px;
      }
      .ki-logo-svg {
        flex-shrink: 0;
        margin-bottom: 1.5rem;
        align-self: flex-start;
      }
      .ki-create-btn {
        margin-top: 12px;
      }
      .ki-actions {
        margin-top: 3em;
      }
      .ki-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .ki-meta {
        font-size: 0.85rem;
        color: #6b7280;
        margin-bottom: 24px;
      }
      .ki-token-entry-fullscreen {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8f9fa;
        z-index: 1000;
      }
      .ki-token-entry-fullscreen .ki-card {
        width: min(500px, 90%);
      }
      .ki-sliding-panel-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        z-index: 1000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .ki-sliding-panel-backdrop.open {
        opacity: 1;
        pointer-events: all;
      }
      .ki-sliding-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(500px, 90vw);
        background: #ffffff;
        box-shadow: -4px 0 20px rgba(15, 23, 42, 0.15);
        z-index: 1001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      .ki-sliding-panel.open {
        transform: translateX(0);
      }
      .ki-sliding-panel-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      .ki-sliding-panel-device-display {
        display: none;
      }
      .ki-sliding-panel-body {
        padding: 24px;
        flex: 1;
        overflow-y: auto;
      }
      .ki-sliding-panel-footer {
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        flex-shrink: 0;
      }
      .ki-btn-large {
        padding: 0.75rem 1.75rem;
        font-size: 1.05rem;
        min-height: 48px;
      }
      
      .ki-btn-large.btn-sm {
        padding: 0.65rem 1.5rem;
        font-size: 0.95rem;
        min-height: 44px;
      }
      .ki-enroll-pulse {
        animation: ki-pulse-glow 2s ease-in-out;
      }
      @keyframes ki-pulse-glow {
        0%, 100% {
          box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
        }
        50% {
          box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
        }
      }
      .ki-create-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        gap: 16px;
        flex-wrap: wrap;
      }
      .ki-demo-mode-section {
        flex: 1;
      }
      .ki-create-header .ki-device-display {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      #add-new-device {
        margin-top: 1.5rem;
      } 
      .ki-form-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
      }
      .ki-form-actions .btn {
        flex: 1;
      }
      .ki-manage-link {
        margin-top: 24px;
        text-align: center;
      }
      .ki-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        gap: 16px;
        flex-wrap: wrap;
      }
      .ki-device-display {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ki-device-label {
        font-size: 0.95rem;
        color: #4b5563;
      }
      .ki-gear-icon {
        cursor: pointer;
        color: #6b7280;
        transition: color 0.2s ease;
        flex-shrink: 0;
        pointer-events: auto;
      }
      .ki-gear-icon:hover {
        color: #000000;
      }
      .ki-device-display .ki-gear-icon {
        pointer-events: auto;
      }
      .ki-star-button {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      }
      .ki-star-button:hover {
        transform: scale(1.1);
      }
      .ki-star-icon {
        display: block;
      }
      .ki-star-icon.filled {
        color: #fbbf24;
      }
      .ki-star-icon.empty {
        color: #d1d5db;
      }
      .ki-star-button:hover .ki-star-icon.empty {
        color: #fbbf24;
      }
      .ki-reset-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .ki-device-form-section {
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid #e5e7eb;
      }
      .ki-device-form-section h3 {
        margin-bottom: 16px;
        font-size: 1.1rem;
      }
      .ki-status {
        margin-top: 16px;
      }
      .spinner {
        display: inline-block;
        width: 1.2rem;
        height: 1.2rem;
        border: 3px solid rgba(0, 0, 0, 0.35);
        border-top-color: #000000;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      .ki-remember {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: #4b5563;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .ki-link {
        background: none;
        border: none;
        padding: 0;
        color: #000000;
        text-decoration: underline;
        cursor: pointer;
        font: inherit;
      }
      .ki-clickable-cell {
        cursor: pointer;
        padding: 0.75rem;
        transition: background-color 0.2s ease;
        text-decoration: underline;
        color: #000000;
      }
      .ki-clickable-cell:hover {
        background-color: #f3f4f6;
      }
      .ki-pencil-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .ki-pencil-icon {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      .ki-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1002;
        padding: 16px;
      }
      .ki-modal {
        width: min(700px, 100%);
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.25);
        display: grid;
        grid-template-rows: auto 1fr auto;
        max-height: 88vh;
        height: 88vh;
      }
      .ki-modal-header,
      .ki-modal-body,
      .ki-modal-footer {
        padding: 16px 24px;
      }
     .ki-modal-body.enroll {
        background:rgb(223, 223, 223);
     }
      .ki-modal-header {
        padding-top: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .ki-modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
      }
      .ki-demo-mode-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
        margin-right: 12px;
      }
      .ki-demo-mode-label {
        font-size: 0.9rem;
        font-weight: 400;
        cursor: pointer;
        user-select: none;
      }
      .ki-demo-mode-label.enabled {
        color: #ff6b35;
      }
      .ki-demo-mode-label.disabled {
        color: #4b5563;
      }
      .ki-toggle-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        cursor: pointer;
      }
      .ki-toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .ki-toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #6b7280;
        transition: 0.3s;
        border-radius: 24px;
      }
      .ki-toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }
      .ki-toggle-switch input:checked + .ki-toggle-slider {
        background-color: #ff6b35;
      }
      .ki-toggle-switch input:checked + .ki-toggle-slider:before {
        transform: translateX(20px);
      }
      .ki-modal-body {
        overflow-y: auto;
      }
      .ki-modal-error-top {
        margin-bottom: 1rem;
      }
      .ki-modal-footer {
        padding-bottom: 24px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
      }
      .ki-enroll-wrapper {
        position: relative;
      }
      .ki-device-popover {
        position: absolute;
        bottom: calc(100% + 8px);
        right: 0;
        width: min(430px, 95vw);
        background: #0f172a;
        color: #f8fafc;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 15px 35px rgba(15, 23, 42, 0.4);
        z-index: 10;
      }
      @media (max-width: 640px) {
        .ki-device-popover {
          position: fixed;
          top: 24px;
          left: 50%;
          right: auto;
          bottom: auto;
          transform: translateX(-50%);
          width: min(520px, calc(100vw - 24px));
          max-height: calc(100vh - 48px);
          overflow-y: auto;
          z-index: 1100;
        }
      }
      .ki-device-popover h4 {
        margin: 0 0 12px;
        font-size: 1rem;
      }
      .ki-device-select {
        margin-bottom: 12px;
        display: grid;
        gap: 8px;
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .ki-device-select select {
        width: 65%;
        min-width: 0;
      }
      .ki-device-empty {
        font-size: 0.85rem;
        color: rgba(248, 250, 252, 0.8);
        margin-bottom: 8px;
        margin-top: 0.5rem;
      }
      .ki-device-empty-light {
        font-size: 0.85rem;
        color: #6b7280;
        margin-top: 0.5rem;
      }
      .ki-device-form {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(3, minmax(100px, 1fr));
        margin-bottom: 12px;
      }
      .ki-device-form-header {
        margin-top: 4em;
        margin-bottom: 8px;
      }
      .ki-device-form-header h5 {
        margin: 0;
        font-size: 0.95rem;
        color: rgba(248, 250, 252, 0.9);
      }
      .ki-device-form label {
        display: flex;
        flex-direction: column;
        font-size: 0.8rem;
        gap: 4px;
      }
      @media (max-width: 520px) {
        .ki-device-form {
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        }
      }
      .ki-device-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }
      .ki-danger {
        padding: 16px 24px;
        border-radius: 12px;
        border: 1px solid rgba(220, 38, 38, 0.3);
        background: rgba(248, 113, 113, 0.08);
        grid-row: -1;
      }
      .ki-danger h3 {
        margin: 0 0 8px;
        font-size: 1rem;
        color: #b91c1c;
      }
      .ki-danger-item {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
        font-size: 0.9rem;
      }
      .ki-danger-item:last-child {
        margin-bottom: 0;
      }
      .ki-btn-danger {
        background: #dc2626;
        border-color: #b91c1c;
        color: #fff;
        min-width: 150px;
        text-align: center;
      }
      .ki-btn-danger:hover:not(:disabled) {
        background: #b91c1c;
        border-color: #991b1b;
      }
      .ki-field-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        margin-bottom: 16px;
      }
      .ki-field label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 0.9rem;
        color: #4b5563;
      }
      .ki-textarea {
        min-height: 125px;
        font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
        resize: vertical;
        white-space: pre;
      }
      .ki-form-row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
      }
      .ki-form-field {
        flex: 1;
      }
      .ki-account-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
      }
      .ki-account-actions-row {
        display: flex;
        gap: 12px;
      }
      .ki-enroll-action-row {
        display: flex;
        width: 100%;
      }
      .ki-enroll-action-row .btn {
        width: 100%;
      }
      .ki-collapsible-section {
        margin-bottom: 1rem;
      }
      .ki-collapsible-section-reset .ki-collapsible-header {
        background: #fee2e2;
        color: #dc2626;
        border-left: 4px solid #dc2626;
      }
      .ki-collapsible-section-reset .ki-collapsible-header:hover {
        background: #fecaca;
      }
      .ki-collapsible-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        background: rgb(223,223,223);
        border: none;
        padding: 1rem;;
        cursor: pointer;
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        text-align: left;
      }
      .ki-collapsible-icon {
        display: inline-flex;
        align-items: center;
        width: 20px;
        height: 20px;
      }
      .ki-collapsible-icon svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
      }
      .ki-collapsible-content {
        padding-top: 1rem;
      }
      .ki-device-select-full {
        width: 100%;
      }
      .ki-enroll-section-row {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
      }
      .ki-enroll-section-row .ki-device-select-full {
        flex: 1;
        margin-bottom: 0;
      }
      .ki-enroll-section-row .ki-device-buttons-row {
        flex: 0 0 auto;
        margin-top: 0;
      }
      .ki-device-buttons-row {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.75rem;
      }
      .ki-device-button {
        flex: 1;
      }
      .ki-device-section {
        margin-top: 2rem;
      }
      .ki-device-section-title {
        margin: 0 0 1rem 0;
      }
      .ki-device-form-row {
        display: flex;
        gap: 16px;
        margin-top: 1rem;
      }
      .ki-device-form-field {
        flex: 1;
      }
      .ki-device-save-wrapper {
        margin-top: 0.75rem;
      }
      .ki-device-save-button {
        width: 100%;
      }
      .ki-device-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font-size: 1rem;
        color: #1f2937;
      }
      .ki-create-device-section {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        align-items: flex-start;
      }
      .ki-create-device-select {
        flex: 1;
        min-width: 200px;
      }
      .ki-create-device-buttons {
        display: flex;
        gap: 0.75rem;
        flex: 0 0 auto;
      }
      .ki-create-device-button {
        flex: 1;
        white-space: nowrap;
      }
      .ki-create-device-form {
        display: flex;
        gap: 16px;
      }
      .ki-required-asterisk {
        color: red;
        margin-left: 2px;
      }
      .ki-error-message {
        margin-top: 1rem;
      }
      .ki-modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        color: #6b7280;
      }
      .ki-modal-close:hover {
        color: #111827;
      }
      @media (max-width: 600px) {
        .ki-collapsible-content .ki-device-select,
        .ki-collapsible-content .ki-device-select-full {
          width: 100%;
          min-width: 100%;
        }
        .ki-collapsible-content .ki-device-select select,
        .ki-collapsible-content .ki-device-select-full select {
          width: 100%;
        }
        .ki-create-device-section {
          flex-direction: column;
        }
        .ki-create-device-section .ki-device-select,
        .ki-create-device-section .ki-create-device-select {
          width: 100%;
          min-width: 100%;
        }
        .ki-create-device-section .ki-device-select select,
        .ki-create-device-section .ki-create-device-select select {
          width: 100%;
        }
        .ki-create-device-section > div:last-child {
          width: 100%;
        }
        .ki-create-device-section > div:last-child button {
          flex: 1;
        }
        .ki-create-device-form {
          flex-wrap: nowrap;
          gap: 8px;
        }
        .ki-create-device-form > div {
          flex: 1;
          min-width: 0;
        }
        .ki-card {
          padding: 16px;
          box-sizing: border-box;
        }
        .ki-heading {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
        .ki-logo-container {
          flex-direction: column;
          width: 100%;
          align-items: flex-start;
        }
        .ki-logout-link {
          margin-left: auto;
          margin-top: 0;
          align-self: flex-start;
        }
        /* Form rows stack on mobile */
        .ki-form-row {
          flex-direction: row;
          gap: 12px;
        }
        .ki-form-row-single {
          flex-direction: column;
        }
        .ki-form-field {
          flex: 1;
          width: auto;
        }
        .ki-form-row-single .ki-form-field {
          width: 100%;
        }
        /* Create header stacks on mobile */
        .ki-create-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
        .ki-create-header .ki-device-display {
          width: 100%;
          flex-wrap: wrap;
        }
        .ki-device-label {
          font-size: 0.875rem;
          margin-bottom: 1.2rem;
        }
        .ki-gear-icon {
          align-self: flex-start;
        }
        /* List header actions stack on mobile */
        .ki-list-header {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }
        .ki-list-header .ki-actions {
          display: flex;
          flex-direction: row;
          gap: 8px;
          width: 100%;
          margin-top: 0;
        }
        .ki-list-header .ki-actions .btn {
          flex: 1;
          width: auto;
        }
        /* Table improvements for mobile */
        .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .table-responsive table {
          min-width: 600px;
        }
        /* Table action buttons stack on mobile */
        .table-responsive td.text-end {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: stretch;
          min-width: 120px;
        }
        .table-responsive td.text-end .btn {
          width: 100%;
          margin: 0;
          white-space: nowrap;
        }
        .table-responsive td.text-end .ki-pencil-btn {
          justify-content: center;
        }
        /* Sliding panel full width on mobile */
        .ki-sliding-panel {
          width: 100vw;
        }
        .ki-sliding-panel-header,
        .ki-sliding-panel-body {
          padding: 16px;
        }
        .ki-sliding-panel-device-display {
          display: block;
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        /* Form actions stack on mobile */
        .ki-form-actions {
          flex-direction: column;
        }
        .ki-form-actions .btn {
          width: 100%;
        }
        /* Device form rows stack on mobile */
        .ki-device-form-row {
          flex-direction: column;
          gap: 12px;
        }
        .ki-device-form-field {
          width: 100%;
        }
        /* Account actions stack on mobile */
        .ki-account-actions-row {
          flex-direction: row;
        }
        .ki-account-actions-row .btn {
          flex: 1;
          width: auto;
        }
        /* Reset actions already column, ensure full width */
        .ki-reset-actions .btn {
          width: 100%;
        }
        /* Device buttons row stacks on mobile */
        .ki-enroll-section-row {
          flex-direction: column;
          align-items: stretch;
        }
        .ki-enroll-section-row .ki-device-select-full {
          width: 100%;
          margin-bottom: 0.75rem;
        }
        .ki-device-buttons-row {
          flex-direction: column;
        }
        .ki-device-buttons-row .btn {
          width: 100%;
        }
      }
    `;

    const fallback = `
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.375rem;
        border: 1px solid transparent;
        font-weight: 600;
        padding: 0.55rem 1.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      .btn-primary {
        background-color: #000000;
        border-color: #000000;
        color: #ffffff;
      }
      .btn-primary:hover:not(:disabled) {
        background-color: #333333;
        border-color: #333333;
      }
      .btn-outline-secondary {
        background: #ffffff;
        color: #000000;
        border-color: #000000;
      }
      .btn-outline-secondary:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: #000000;
      }
      .form-control {
        width: 100%;
        padding: 0.65rem 0.75rem;
        border-radius: 0.375rem;
        border: 1px solid #d1d5db;
        font-size: 1rem;
        transition: border-color 0.2s ease;
        box-sizing: border-box;
      }
      .form-control:focus {
        outline: none;
        border-color: #000000;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.24);
      }
      .form-select {
        width: 100%;
        padding: 0.65rem 0.75rem;
        border-radius: 0.375rem;
        border: 1px solid #d1d5db;
        font-size: 1rem;
        transition: border-color 0.2s ease;
        box-sizing: border-box;
        background-color: #ffffff;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        background-size: 16px 12px;
        padding-right: 2.5rem;
        appearance: none;
      }
      .form-select:focus {
        outline: none;
        border-color: #000000;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.24);
      }
      .form-select:disabled {
        background-color: #e9ecef;
        opacity: 1;
        cursor: not-allowed;
      }
      .table-responsive {
        width: 100%;
        overflow-x: auto;
        padding-bottom: 4px;
      }
      .table-responsive::-webkit-scrollbar {
        height: 0;
      }
      .table-responsive {
        scrollbar-width: none;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      thead {
        background: #f9fafb;
      }
      th,
      td {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
        font-size: 0.95rem;
      }
      tbody tr:hover {
        background: #f3f4f6;
      }
      .alert {
        border-radius: 0.375rem;
        padding: 0.75rem 1rem;
        margin-top: 1rem;
      }
      .alert-danger {
        background: #fee2e2;
        color: #b91c1c;
      }
      .alert-success {
        background: #dcfce7;
        color: #166534;
      }
      .ki-link {
        background: none;
        border: none;
        padding: 0;
        color: #000000;
        text-decoration: underline;
        cursor: pointer;
        font: inherit;
        text-align: left;
      }
      .ki-pencil-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .ki-pencil-icon {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      .ki-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1002;
        padding: 16px;
      }
      .ki-modal {
        width: min(700px, 100%);
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.25);
        display: grid;
        grid-template-rows: auto 1fr auto;
        max-height: 88vh;
        height: 88vh;
      }
      .ki-modal-header,
      .ki-modal-body,
      .ki-modal-footer {
        padding: 16px 24px;
      }
      .ki-modal-header {
        padding-top: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .ki-demo-mode-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
        margin-right: 12px;
      }
      .ki-demo-mode-label {
        font-size: 0.9rem;
        font-weight: 400;
        cursor: pointer;
        user-select: none;
      }
      .ki-demo-mode-label.enabled {
        color: #ff6b35;
      }
      .ki-demo-mode-label.disabled {
        color: #4b5563;
      }
      .ki-toggle-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        cursor: pointer;
      }
      .ki-toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .ki-toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #6b7280;
        transition: 0.3s;
        border-radius: 24px;
      }
      .ki-toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }
      .ki-toggle-switch input:checked + .ki-toggle-slider {
        background-color: #ff6b35;
      }
      .ki-toggle-switch input:checked + .ki-toggle-slider:before {
        transform: translateX(20px);
      }
      .ki-modal-body {
        overflow-y: auto;
      }
      .ki-modal-footer {
        padding-bottom: 24px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .ki-field-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        margin-bottom: 16px;
      }
      .ki-field label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 0.9rem;
        color: #4b5563;
      }
      .ki-textarea {
        min-height: 125px;
        font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
        resize: vertical;
        white-space: pre;
      }
      .ki-form-row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
      }
      .ki-form-field {
        flex: 1;
      }
      .ki-account-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
      }
      .ki-account-actions-row {
        display: flex;
        gap: 12px;
      }
      .ki-enroll-action-row {
        display: flex;
        width: 100%;
      }
      .ki-enroll-action-row .btn {
        width: 100%;
      }
      .ki-collapsible-section {
        margin-bottom: 1rem;
      }
      .ki-collapsible-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        background: rgb(223,223,223);
        border: none;
        padding: 1rem;
        cursor: pointer;
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        text-align: left;
      }
      .ki-collapsible-icon {
        display: inline-flex;
        align-items: center;
        width: 20px;
        height: 20px;
      }
      .ki-collapsible-icon svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
      }
      .ki-collapsible-content {
        padding-top: 1rem;
      }
      .ki-device-select-full {
        width: 100%;
      }
      .ki-device-buttons-row {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.75rem;
      }
      .ki-device-button {
        flex: 1;
      }
      .ki-device-section {
        margin-top: 2rem;
      }
      .ki-device-section.add-new {
        margin-top: 4em;
        padding: 0.4em;
        background: rgb(223,223,223);
      }
      .ki-device-section-title {
        margin: 0 0 1rem 0;
      }
      .ki-device-form-row {
        display: flex;
        gap: 16px;
        margin-top: 1rem;
      }
      .ki-device-form-field {
        flex: 1;
      }
      .ki-device-save-wrapper {
        margin-top: 0.75rem;
      }
      .ki-device-save-button {
        width: 100%;
      }
      .ki-device-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font-size: 1rem;
        color: #1f2937;
      }
      .ki-create-device-section {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        align-items: flex-start;
      }
      .ki-create-device-select {
        flex: 1;
        min-width: 200px;
      }
      .ki-create-device-buttons {
        display: flex;
        gap: 0.75rem;
        flex: 0 0 auto;
      }
      .ki-create-device-button {
        flex: 1;
        white-space: nowrap;
      }
      .ki-create-device-form {
        display: flex;
        gap: 16px;
      }
      .ki-required-asterisk {
        color: red;
        margin-left: 2px;
      }
      .ki-error-message {
        margin-top: 1rem;
      }
      .ki-modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        color: #6b7280;
      }
      .ki-modal-close:hover {
        color: #111827;
      }
      .ki-demo-mode-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
        margin-right: 12px;
      }
      .ki-demo-mode-label {
        font-size: 0.9rem;
        font-weight: 400;
        cursor: pointer;
        user-select: none;
      }
      .ki-demo-mode-label.enabled {
        color: #ff6b35;
      }
      .ki-demo-mode-label.disabled {
        color: #4b5563;
      }
      .ki-toggle-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        cursor: pointer;
      }
      .ki-toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .ki-toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #6b7280;
        transition: 0.3s;
        border-radius: 24px;
      }
      .ki-toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }
      .ki-toggle-switch input:checked + .ki-toggle-slider {
        background-color: #ff6b35;
      }
      .ki-toggle-switch input:checked + .ki-toggle-slider:before {
        transform: translateX(20px);
      }
    `;

    return shared + (useBootstrap ? '' : fallback);
  }

  render() {
    const useBootstrap = this.detectBootstrap();
    const styles = this.getStyles(useBootstrap);
    
    // If not authenticated, show full-screen token entry
    if (!this.orgToken) {
      this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        ${this.renderTokenEntryView()}
      `;
      this.bindEvents();
      return;
    }
    
    // Authenticated - show appropriate view
    let mainContent = '';
    if (this.currentView === 'device-admin') {
      mainContent = this.renderDeviceAdminView();
    } else if (this.currentView === 'list') {
      mainContent = this.renderListView();
    } else {
      mainContent = this.renderCreateView();
    }
    
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="ki-card">
        ${mainContent}
        ${this.error ? `<div class="alert alert-danger">${this.error}</div>` : ''}
      </div>
      ${this.renderSlidingPanel()}
    `;
    this.bindEvents();
  }

  renderTokenEntryView() {
    return `
      <div class="ki-token-entry-fullscreen">
        <div class="ki-card">
          <div class="ki-heading">
            <div>
              <div class="ki-logo-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="138" height="48" viewBox="0 0 138 48" fill="none" class="ki-logo-svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M23.9994 45.0003C12.4018 45.0003 3.00009 35.5983 3.00009 24.0003C3.00009 12.4023 12.4018 3.00034 23.9994 3.00034C35.597 3.00034 44.9987 12.4023 44.9987 24.0003C44.9987 35.5983 35.597 45.0003 23.9994 45.0003ZM23.9992 0C10.7444 0 0 10.7448 0 24C0 37.2552 10.7444 48 23.9992 48C37.2539 48 47.9984 37.2552 47.9984 24C47.9984 10.7448 37.2539 0 23.9992 0Z" fill="#0A0A0B"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M19.1496 15.412L20.2715 16.4296L22.4483 14.2528L20.9159 12.8608C19.9416 11.9752 18.6732 11.4856 17.3568 11.4856C14.3749 11.4856 11.957 13.9024 11.957 16.8856V30.964C11.957 33.2488 13.2734 35.4136 15.4069 36.2284C17.472 37.0168 19.7016 36.4804 21.1655 35.0056L28.7445 27.3724L26.5173 25.1452L19.2324 32.4808C17.5776 34.1476 14.7349 32.9788 14.7301 30.6304L14.7037 17.3872C14.6989 15.0772 17.4384 13.8604 19.1496 15.412Z" fill="#0A0A0B"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M20.3115 29.2128L22.4727 27.0516C22.4283 27 21.7407 26.2296 21.5631 26.0508C20.4423 24.93 20.6523 22.902 21.7731 21.7812L28.0621 15.492C29.184 14.3712 31.0008 14.3712 32.1227 15.492C33.2435 16.6128 33.2435 18.4308 32.1227 19.5516L31.3716 20.3028L31.0392 20.6352L33.2615 22.8564L33.6023 22.5156L34.2971 21.8208C36.6358 19.482 36.6358 15.69 34.2971 13.3512C31.9583 11.0124 28.1677 11.0124 25.8289 13.3512L19.582 19.5984C17.2432 21.9372 17.032 25.9392 19.3708 28.278C19.6228 28.5288 20.2971 29.2104 20.2971 29.2104C20.2971 29.2104 20.3091 29.2128 20.3115 29.2128Z" fill="#0A0A0B"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M34.3646 26.3443L26.9213 18.9007L24.7337 21.0883L32.2239 28.5787C33.3446 29.6995 33.3446 31.5175 32.2239 32.6383C31.1031 33.7591 29.2852 33.7591 28.1644 32.6383L27.4132 31.8871L26.9333 31.4071L24.7109 33.6295L25.2005 34.1191L25.8953 34.8139C28.234 37.1527 32.0259 37.1527 34.3646 34.8139C36.7033 32.4751 36.7033 28.6831 34.3646 26.3443Z" fill="#0A0A0B"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M72.0737 30.4804H68.2098L62.93 23.2804L60.2901 26.1844V30.4804H57.0742V13.6804H60.2901V22.0564L67.8739 13.6804H71.6657L65.2099 20.7844L72.0737 30.4804Z" fill="#0A0A0B"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M77.8594 13.6804H90.171V16.4884H81.0753V20.6404H89.235V23.4484H81.0753V27.6724H90.4589V30.4804H77.8594V13.6804Z" fill="#0A0A0B"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M110.588 13.6804L104.468 24.9844V30.4804H101.252V25.1044L94.9883 13.6804H98.2522L102.836 21.5764L107.348 13.6804H110.588Z" fill="#0A0A0B"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M120.222 17.092C119.341 17.596 118.646 18.2836 118.134 19.156C117.621 20.0284 117.366 20.992 117.366 22.048C117.366 23.104 117.625 24.0724 118.146 24.952C118.665 25.8316 119.361 26.5276 120.234 27.04C121.105 27.5524 122.053 27.808 123.077 27.808C124.085 27.808 125.021 27.5524 125.885 27.04C126.749 26.5276 127.433 25.8316 127.937 24.952C128.441 24.0724 128.693 23.104 128.693 22.048C128.693 20.992 128.441 20.0284 127.937 19.156C127.433 18.2836 126.749 17.596 125.885 17.092C125.021 16.588 124.085 16.336 123.077 16.336C122.053 16.336 121.101 16.588 120.222 17.092ZM127.574 14.5848C128.942 15.3372 130.018 16.3692 130.802 17.6808C131.585 18.9924 131.978 20.4492 131.978 22.0488C131.978 23.6484 131.585 25.1088 130.802 26.4288C130.018 27.7488 128.942 28.7928 127.574 29.5608C126.206 30.3288 124.69 30.7128 123.026 30.7128C121.362 30.7128 119.846 30.3288 118.478 29.5608C117.11 28.7928 116.034 27.7488 115.25 26.4288C114.467 25.1088 114.074 23.6484 114.074 22.0488C114.074 20.4492 114.467 18.9924 115.25 17.6808C116.034 16.3692 117.11 15.3372 118.478 14.5848C119.846 13.8324 121.362 13.4568 123.026 13.4568C124.69 13.4568 126.206 13.8324 127.574 14.5848Z" fill="#0A0A0B"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M89.6328 39.2716H101.479V36.4636H89.6328V39.2716Z" fill="#0A0A0B"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M134.11 14.8735H134.679C134.861 14.8735 135 14.8339 135.096 14.7547C135.192 14.6755 135.24 14.5579 135.24 14.4019C135.24 14.2483 135.192 14.1331 135.096 14.0563C135 13.9795 134.861 13.9411 134.679 13.9411H134.11V14.8735ZM135.202 16.0356L134.766 15.2904C134.747 15.2928 134.717 15.294 134.676 15.294H134.107V16.0356H133.625V13.5156H134.676C135.003 13.5156 135.255 13.5912 135.432 13.7424C135.61 13.8936 135.699 14.1072 135.699 14.3832C135.699 14.58 135.657 14.748 135.57 14.8872C135.485 15.0264 135.361 15.1308 135.198 15.2004L135.753 16.0356H135.202Z" fill="#0A0A0B"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M134.558 17.3831C135.98 17.3831 137.133 16.2299 137.133 14.8079C137.133 13.3858 135.98 12.2327 134.558 12.2327C133.136 12.2327 131.984 13.3856 131.984 14.8079C131.984 16.2301 133.136 17.3831 134.558 17.3831ZM134.558 12.5332C135.815 12.5332 136.833 13.552 136.833 14.8084C136.833 16.0647 135.815 17.0836 134.558 17.0836C133.302 17.0836 132.284 16.065 132.284 14.8084C132.284 13.5518 133.302 12.5332 134.558 12.5332Z" fill="#0A0A0B"/>
                </svg>
                <h1>Identities</h1>
              </div>
              <p class="ki-meta">Enter your email and password to begin</p>
            </div>
          </div>
          <form class="ki-form" id="ki-auth-form">
            <label>
              <span>Email</span>
              <input
                name="email"
                type="email"
                class="form-control"
                placeholder="Enter email"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                name="password"
                type="password"
                class="form-control"
                placeholder="Enter password"
                required
              />
            </label>
            <button class="btn btn-primary" type="submit">
              ${this.loading ? '<span class="spinner"></span>&nbsp;Logging in…' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    `;
  }

  renderCreateView() {
    const header = this.renderHeader('Create new account');
    // Ensure device is auto-selected
    const autoDeviceId = this.getAutoSelectedDeviceId();
    if (autoDeviceId && !this.selectedDeviceId) {
      this.selectedDeviceId = autoDeviceId;
    }
    
    // Validate form fields
    const firstName = (this.createForm.first_name || '').trim();
    const phone = (this.createForm.phone || '').trim();
    const lastName = (this.createForm.last_name || '').trim();
    const email = (this.createForm.email || '').trim();
    
    let canCreate = false;
    if (this.demoMode) {
      // Demo mode: require first name and phone
      canCreate = firstName.length > 0 && phone.length > 0;
    } else {
      // Non-demo mode: require first name, last name, and at least one of phone or email
      canCreate = firstName.length > 0 && lastName.length > 0 && (phone.length > 0 || email.length > 0);
    }
    
    return `
      <div>
        ${header}
        <div class="ki-create-header">
          <div class="ki-demo-mode-section">
            <div class="ki-demo-mode-container">
              <label class="ki-demo-mode-label ${this.demoMode ? 'enabled' : 'disabled'}" for="demo-mode-toggle-create">
                Demo mode
              </label>
              <label class="ki-toggle-switch">
                <input
                  type="checkbox"
                  id="demo-mode-toggle-create"
                  data-action="toggle-demo-mode"
                  ${this.demoMode ? 'checked' : ''}
                />
                <span class="ki-toggle-slider"></span>
              </label>
            </div>
            </div>
            ${this.renderDeviceDisplay()}
        </div>
        <form class="ki-form" id="ki-create-form">
          ${this.demoMode ? `
            <div class="ki-form-row">
              <div class="ki-form-field">
                ${this.renderField('First Name', 'first_name', this.createForm.first_name, 'text', 'create', true)}
              </div>
              <div class="ki-form-field">
                ${this.renderField('Phone', 'phone', this.createForm.phone, 'tel', 'create', true)}
              </div>
            </div>
          ` : `
            <div class="ki-form-row">
              <div class="ki-form-field">
                ${this.renderField('First Name', 'first_name', this.createForm.first_name, 'text', 'create', true)}
              </div>
              <div class="ki-form-field">
                ${this.renderField('Last Name', 'last_name', this.createForm.last_name, 'text', 'create', true)}
              </div>
            </div>
            <div class="ki-form-row">
              <div class="ki-form-field">
                ${this.renderField('Phone', 'phone', this.createForm.phone, 'tel', 'create', false)}
              </div>
              <div class="ki-form-field">
                ${this.renderField('Email', 'email', this.createForm.email, 'email', 'create', false)}
              </div>
            </div>
            <div class="ki-form-row">
              <div class="ki-form-field">
                ${this.renderField('Date of Birth', 'date_of_birth', this.createForm.date_of_birth || '', 'date', 'create', false)}
              </div>
            </div>
            <div class="ki-field">
              <label>
                Metadata (JSON)
                <textarea class="form-control ki-textarea" data-create-input="metadataText">${this.escapeHtml(this.createForm.metadataText || '')}</textarea>
              </label>
            </div>
          `}
          <div class="ki-form-actions">
            <button class="btn btn-outline-secondary ki-btn-large" type="button" data-action="create-account" ${!canCreate || this.createLoading ? 'disabled' : ''}>
              ${this.createLoading ? '<span class="spinner"></span>&nbsp;Creating' : 'Create account'}
            </button>
            <button class="btn btn-primary ki-btn-large" type="button" data-action="create-and-enroll" ${!canCreate || !autoDeviceId || this.createLoading ? 'disabled' : ''}>
              ${this.createLoading ? '<span class="spinner"></span>&nbsp;Creating' : 'Create and enroll'}
            </button>
          </div>
          ${this.createError ? `<div class="alert alert-danger ki-error-message">${this.escapeHtml(this.createError)}</div>` : ''}
        </form>
        <div class="ki-manage-link">
          <button class="ki-link" data-action="navigate-to-list">Manage Identities</button>
        </div>
      </div>
    `;
  }

  renderListView() {
    const header = this.renderHeader();
    
    return `
      <div>
        ${header}
        <div class="ki-list-header">
          ${this.renderDeviceDisplay()}
          <div class="ki-actions">
            <button class="btn btn-primary" data-action="navigate-to-create">Create Account</button>
            <button class="btn btn-outline-secondary" data-action="refresh" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? '<span class="spinner"></span>&nbsp;Refreshing' : 'Refresh list'}
            </button>
          </div>
        </div>
        ${this.renderIdentitiesTable()}
      </div>
    `;
  }

  renderIdentitiesTable() {
    const hasIdentities = this.identities.length > 0;
    const rows = hasIdentities
      ? this.identities
          .map((identity) => {
            const firstName = identity.first_name || '—';
            const lastName = identity.last_name || '—';
            const email = identity.email || '—';
            const phone = identity.phone || '—';
            const id = identity.id ?? '—';
            const created =
              identity.creation_date ||
              identity.created_at ||
              identity.updated_at ||
              '—';
            return `<tr>
              <td class="ki-clickable-cell" data-action="open-panel" data-identity-id="${this.escapeHtml(String(id))}">
                ${this.escapeHtml(firstName)}
              </td>
              <td class="ki-clickable-cell" data-action="open-panel" data-identity-id="${this.escapeHtml(String(id))}">
                ${this.escapeHtml(lastName)}
              </td>
              <td>${this.escapeHtml(phone)}</td>
              <td>${this.escapeHtml(email)}</td>
              <td>${this.escapeHtml(created)}</td>
              <td class="text-end">
                <button class="btn btn-outline-secondary btn-sm ki-btn-large ki-pencil-btn" data-action="open-panel" data-identity-id="${this.escapeHtml(String(id))}">
                  <span>Edit</span>
                  <span class="ki-pencil-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                      <path d="M100.4 417.2C104.5 402.6 112.2 389.3 123 378.5L304.2 197.3L338.1 163.4C354.7 180 389.4 214.7 442.1 267.4L476 301.3L442.1 335.2L260.9 516.4C250.2 527.1 236.8 534.9 222.2 539L94.4 574.6C86.1 576.9 77.1 574.6 71 568.4C64.9 562.2 62.6 553.3 64.9 545L100.4 417.2zM156 413.5C151.6 418.2 148.4 423.9 146.7 430.1L122.6 517L209.5 492.9C215.9 491.1 221.7 487.8 226.5 483.2L155.9 413.5zM510 267.4C493.4 250.8 458.7 216.1 406 163.4L372 129.5C398.5 103 413.4 88.1 416.9 84.6C430.4 71 448.8 63.4 468 63.4C487.2 63.4 505.6 71 519.1 84.6L554.8 120.3C568.4 133.9 576 152.3 576 171.4C576 190.5 568.4 209 554.8 222.5C551.3 226 536.4 240.9 509.9 267.4z"/>
                    </svg>
                  </span>
                </button>
                <button class="btn btn-primary btn-sm ki-btn-large" data-action="re-enroll" data-identity-id="${this.escapeHtml(String(id))}" ${!this.getAutoSelectedDeviceId() ? 'disabled' : ''}>
                  Enroll
                </button>
              </td>
            </tr>`;
          })
          .join('')
      : '<tr><td colspan="6">No identities were returned.</td></tr>';

    return `
      <div class="table-responsive">
        <table class="table table-striped align-middle">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Created</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  renderHeader(title = 'Identities Accounts') {
    // Only show logout link when authenticated (not on token entry screen)
    const logoutLink = this.orgToken ? `
      <a class="ki-logout-link" href="#" data-action="reset-token" title="Logout">
        <span class="ki-logout-text">Logout</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="12" height="12" fill="currentColor">
          <path d="M160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0zM502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 192 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128z"/>
        </svg>
      </a>
    ` : '';
    
    return `
      <div class="ki-heading">
        <div>
          <div class="ki-logo-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="138" height="48" viewBox="0 0 138 48" fill="none" class="ki-logo-svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M23.9994 45.0003C12.4018 45.0003 3.00009 35.5983 3.00009 24.0003C3.00009 12.4023 12.4018 3.00034 23.9994 3.00034C35.597 3.00034 44.9987 12.4023 44.9987 24.0003C44.9987 35.5983 35.597 45.0003 23.9994 45.0003ZM23.9992 0C10.7444 0 0 10.7448 0 24C0 37.2552 10.7444 48 23.9992 48C37.2539 48 47.9984 37.2552 47.9984 24C47.9984 10.7448 37.2539 0 23.9992 0Z" fill="#0A0A0B"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M19.1496 15.412L20.2715 16.4296L22.4483 14.2528L20.9159 12.8608C19.9416 11.9752 18.6732 11.4856 17.3568 11.4856C14.3749 11.4856 11.957 13.9024 11.957 16.8856V30.964C11.957 33.2488 13.2734 35.4136 15.4069 36.2284C17.472 37.0168 19.7016 36.4804 21.1655 35.0056L28.7445 27.3724L26.5173 25.1452L19.2324 32.4808C17.5776 34.1476 14.7349 32.9788 14.7301 30.6304L14.7037 17.3872C14.6989 15.0772 17.4384 13.8604 19.1496 15.412Z" fill="#0A0A0B"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M20.3115 29.2128L22.4727 27.0516C22.4283 27 21.7407 26.2296 21.5631 26.0508C20.4423 24.93 20.6523 22.902 21.7731 21.7812L28.0621 15.492C29.184 14.3712 31.0008 14.3712 32.1227 15.492C33.2435 16.6128 33.2435 18.4308 32.1227 19.5516L31.3716 20.3028L31.0392 20.6352L33.2615 22.8564L33.6023 22.5156L34.2971 21.8208C36.6358 19.482 36.6358 15.69 34.2971 13.3512C31.9583 11.0124 28.1677 11.0124 25.8289 13.3512L19.582 19.5984C17.2432 21.9372 17.032 25.9392 19.3708 28.278C19.6228 28.5288 20.2971 29.2104 20.2971 29.2104C20.2971 29.2104 20.3091 29.2128 20.3115 29.2128Z" fill="#0A0A0B"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M34.3646 26.3443L26.9213 18.9007L24.7337 21.0883L32.2239 28.5787C33.3446 29.6995 33.3446 31.5175 32.2239 32.6383C31.1031 33.7591 29.2852 33.7591 28.1644 32.6383L27.4132 31.8871L26.9333 31.4071L24.7109 33.6295L25.2005 34.1191L25.8953 34.8139C28.234 37.1527 32.0259 37.1527 34.3646 34.8139C36.7033 32.4751 36.7033 28.6831 34.3646 26.3443Z" fill="#0A0A0B"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M72.0737 30.4804H68.2098L62.93 23.2804L60.2901 26.1844V30.4804H57.0742V13.6804H60.2901V22.0564L67.8739 13.6804H71.6657L65.2099 20.7844L72.0737 30.4804Z" fill="#0A0A0B"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M77.8594 13.6804H90.171V16.4884H81.0753V20.6404H89.235V23.4484H81.0753V27.6724H90.4589V30.4804H77.8594V13.6804Z" fill="#0A0A0B"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M110.588 13.6804L104.468 24.9844V30.4804H101.252V25.1044L94.9883 13.6804H98.2522L102.836 21.5764L107.348 13.6804H110.588Z" fill="#0A0A0B"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M120.222 17.092C119.341 17.596 118.646 18.2836 118.134 19.156C117.621 20.0284 117.366 20.992 117.366 22.048C117.366 23.104 117.625 24.0724 118.146 24.952C118.665 25.8316 119.361 26.5276 120.234 27.04C121.105 27.5524 122.053 27.808 123.077 27.808C124.085 27.808 125.021 27.5524 125.885 27.04C126.749 26.5276 127.433 25.8316 127.937 24.952C128.441 24.0724 128.693 23.104 128.693 22.048C128.693 20.992 128.441 20.0284 127.937 19.156C127.433 18.2836 126.749 17.596 125.885 17.092C125.021 16.588 124.085 16.336 123.077 16.336C122.053 16.336 121.101 16.588 120.222 17.092ZM127.574 14.5848C128.942 15.3372 130.018 16.3692 130.802 17.6808C131.585 18.9924 131.978 20.4492 131.978 22.0488C131.978 23.6484 131.585 25.1088 130.802 26.4288C130.018 27.7488 128.942 28.7928 127.574 29.5608C126.206 30.3288 124.69 30.7128 123.026 30.7128C121.362 30.7128 119.846 30.3288 118.478 29.5608C117.11 28.7928 116.034 27.7488 115.25 26.4288C114.467 25.1088 114.074 23.6484 114.074 22.0488C114.074 20.4492 114.467 18.9924 115.25 17.6808C116.034 16.3692 117.11 15.3372 118.478 14.5848C119.846 13.8324 121.362 13.4568 123.026 13.4568C124.69 13.4568 126.206 13.8324 127.574 14.5848Z" fill="#0A0A0B"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M89.6328 39.2716H101.479V36.4636H89.6328V39.2716Z" fill="#0A0A0B"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M134.11 14.8735H134.679C134.861 14.8735 135 14.8339 135.096 14.7547C135.192 14.6755 135.24 14.5579 135.24 14.4019C135.24 14.2483 135.192 14.1331 135.096 14.0563C135 13.9795 134.861 13.9411 134.679 13.9411H134.11V14.8735ZM135.202 16.0356L134.766 15.2904C134.747 15.2928 134.717 15.294 134.676 15.294H134.107V16.0356H133.625V13.5156H134.676C135.003 13.5156 135.255 13.5912 135.432 13.7424C135.61 13.8936 135.699 14.1072 135.699 14.3832C135.699 14.58 135.657 14.748 135.57 14.8872C135.485 15.0264 135.361 15.1308 135.198 15.2004L135.753 16.0356H135.202Z" fill="#0A0A0B"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M134.558 17.3831C135.98 17.3831 137.133 16.2299 137.133 14.8079C137.133 13.3858 135.98 12.2327 134.558 12.2327C133.136 12.2327 131.984 13.3856 131.984 14.8079C131.984 16.2301 133.136 17.3831 134.558 17.3831ZM134.558 12.5332C135.815 12.5332 136.833 13.552 136.833 14.8084C136.833 16.0647 135.815 17.0836 134.558 17.0836C133.302 17.0836 132.284 16.065 132.284 14.8084C132.284 13.5518 133.302 12.5332 134.558 12.5332Z" fill="#0A0A0B"/>
            </svg>
            <h1>${this.escapeHtml(title)}</h1>
          </div>
        </div>
        ${logoutLink}
      </div>
    `;
  }

  renderTableView() {
    const hasIdentities = this.identities.length > 0;
    const rows = hasIdentities
                    ? this.identities
                        .map((identity) => {
                          const firstName = identity.first_name || '—';
                          const lastName = identity.last_name || '—';
                          const email = identity.email || '—';
                          const phone = identity.phone || '—';
                          const id = identity.id ?? '—';
                          const created =
                            identity.creation_date ||
                            identity.created_at ||
                            identity.updated_at ||
                            '—';
                          return `<tr>
                            <td>
                              <button class="ki-link" data-action="open-modal" data-identity-id="${this.escapeHtml(String(id))}">
                                ${this.escapeHtml(firstName)}
                              </button>
                            </td>
                            <td>${this.escapeHtml(lastName)}</td>
                            <td>${this.escapeHtml(phone)}</td>
                            <td>${this.escapeHtml(email)}</td>
                            <td>${this.escapeHtml(created)}</td>
                            <td class="text-end">
                              <button class="btn btn-outline-secondary btn-sm ki-pencil-btn" data-action="open-modal" data-identity-id="${this.escapeHtml(String(id))}">
                                <span>Edit</span>
                                <span class="ki-pencil-icon" aria-hidden="true">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                                    <path d="M100.4 417.2C104.5 402.6 112.2 389.3 123 378.5L304.2 197.3L338.1 163.4C354.7 180 389.4 214.7 442.1 267.4L476 301.3L442.1 335.2L260.9 516.4C250.2 527.1 236.8 534.9 222.2 539L94.4 574.6C86.1 576.9 77.1 574.6 71 568.4C64.9 562.2 62.6 553.3 64.9 545L100.4 417.2zM156 413.5C151.6 418.2 148.4 423.9 146.7 430.1L122.6 517L209.5 492.9C215.9 491.1 221.7 487.8 226.5 483.2L155.9 413.5zM510 267.4C493.4 250.8 458.7 216.1 406 163.4L372 129.5C398.5 103 413.4 88.1 416.9 84.6C430.4 71 448.8 63.4 468 63.4C487.2 63.4 505.6 71 519.1 84.6L554.8 120.3C568.4 133.9 576 152.3 576 171.4C576 190.5 568.4 209 554.8 222.5C551.3 226 536.4 240.9 509.9 267.4z"/>
                                  </svg>
                                </span>
                              </button>
                            </td>
                          </tr>`;
                        })
                        .join('')
      : '<tr><td colspan="6">No identities were returned.</td></tr>';

    const tableMarkup = `
      <div class="table-responsive">
        <table class="table table-striped align-middle">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Created</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
              </tbody>
            </table>
      </div>`;

    return `
      <div>
        <div class="ki-heading">
          <div>
            <div class="ki-logo-container">
              <svg xmlns="http://www.w3.org/2000/svg" width="138" height="48" viewBox="0 0 138 48" fill="none" class="ki-logo-svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M23.9994 45.0003C12.4018 45.0003 3.00009 35.5983 3.00009 24.0003C3.00009 12.4023 12.4018 3.00034 23.9994 3.00034C35.597 3.00034 44.9987 12.4023 44.9987 24.0003C44.9987 35.5983 35.597 45.0003 23.9994 45.0003ZM23.9992 0C10.7444 0 0 10.7448 0 24C0 37.2552 10.7444 48 23.9992 48C37.2539 48 47.9984 37.2552 47.9984 24C47.9984 10.7448 37.2539 0 23.9992 0Z" fill="#0A0A0B"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M19.1496 15.412L20.2715 16.4296L22.4483 14.2528L20.9159 12.8608C19.9416 11.9752 18.6732 11.4856 17.3568 11.4856C14.3749 11.4856 11.957 13.9024 11.957 16.8856V30.964C11.957 33.2488 13.2734 35.4136 15.4069 36.2284C17.472 37.0168 19.7016 36.4804 21.1655 35.0056L28.7445 27.3724L26.5173 25.1452L19.2324 32.4808C17.5776 34.1476 14.7349 32.9788 14.7301 30.6304L14.7037 17.3872C14.6989 15.0772 17.4384 13.8604 19.1496 15.412Z" fill="#0A0A0B"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M20.3115 29.2128L22.4727 27.0516C22.4283 27 21.7407 26.2296 21.5631 26.0508C20.4423 24.93 20.6523 22.902 21.7731 21.7812L28.0621 15.492C29.184 14.3712 31.0008 14.3712 32.1227 15.492C33.2435 16.6128 33.2435 18.4308 32.1227 19.5516L31.3716 20.3028L31.0392 20.6352L33.2615 22.8564L33.6023 22.5156L34.2971 21.8208C36.6358 19.482 36.6358 15.69 34.2971 13.3512C31.9583 11.0124 28.1677 11.0124 25.8289 13.3512L19.582 19.5984C17.2432 21.9372 17.032 25.9392 19.3708 28.278C19.6228 28.5288 20.2971 29.2104 20.2971 29.2104C20.2971 29.2104 20.3091 29.2128 20.3115 29.2128Z" fill="#0A0A0B"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M34.3646 26.3443L26.9213 18.9007L24.7337 21.0883L32.2239 28.5787C33.3446 29.6995 33.3446 31.5175 32.2239 32.6383C31.1031 33.7591 29.2852 33.7591 28.1644 32.6383L27.4132 31.8871L26.9333 31.4071L24.7109 33.6295L25.2005 34.1191L25.8953 34.8139C28.234 37.1527 32.0259 37.1527 34.3646 34.8139C36.7033 32.4751 36.7033 28.6831 34.3646 26.3443Z" fill="#0A0A0B"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M72.0737 30.4804H68.2098L62.93 23.2804L60.2901 26.1844V30.4804H57.0742V13.6804H60.2901V22.0564L67.8739 13.6804H71.6657L65.2099 20.7844L72.0737 30.4804Z" fill="#0A0A0B"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M77.8594 13.6804H90.171V16.4884H81.0753V20.6404H89.235V23.4484H81.0753V27.6724H90.4589V30.4804H77.8594V13.6804Z" fill="#0A0A0B"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M110.588 13.6804L104.468 24.9844V30.4804H101.252V25.1044L94.9883 13.6804H98.2522L102.836 21.5764L107.348 13.6804H110.588Z" fill="#0A0A0B"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M120.222 17.092C119.341 17.596 118.646 18.2836 118.134 19.156C117.621 20.0284 117.366 20.992 117.366 22.048C117.366 23.104 117.625 24.0724 118.146 24.952C118.665 25.8316 119.361 26.5276 120.234 27.04C121.105 27.5524 122.053 27.808 123.077 27.808C124.085 27.808 125.021 27.5524 125.885 27.04C126.749 26.5276 127.433 25.8316 127.937 24.952C128.441 24.0724 128.693 23.104 128.693 22.048C128.693 20.992 128.441 20.0284 127.937 19.156C127.433 18.2836 126.749 17.596 125.885 17.092C125.021 16.588 124.085 16.336 123.077 16.336C122.053 16.336 121.101 16.588 120.222 17.092ZM127.574 14.5848C128.942 15.3372 130.018 16.3692 130.802 17.6808C131.585 18.9924 131.978 20.4492 131.978 22.0488C131.978 23.6484 131.585 25.1088 130.802 26.4288C130.018 27.7488 128.942 28.7928 127.574 29.5608C126.206 30.3288 124.69 30.7128 123.026 30.7128C121.362 30.7128 119.846 30.3288 118.478 29.5608C117.11 28.7928 116.034 27.7488 115.25 26.4288C114.467 25.1088 114.074 23.6484 114.074 22.0488C114.074 20.4492 114.467 18.9924 115.25 17.6808C116.034 16.3692 117.11 15.3372 118.478 14.5848C119.846 13.8324 121.362 13.4568 123.026 13.4568C124.69 13.4568 126.206 13.8324 127.574 14.5848Z" fill="#0A0A0B"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M89.6328 39.2716H101.479V36.4636H89.6328V39.2716Z" fill="#0A0A0B"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M134.11 14.8735H134.679C134.861 14.8735 135 14.8339 135.096 14.7547C135.192 14.6755 135.24 14.5579 135.24 14.4019C135.24 14.2483 135.192 14.1331 135.096 14.0563C135 13.9795 134.861 13.9411 134.679 13.9411H134.11V14.8735ZM135.202 16.0356L134.766 15.2904C134.747 15.2928 134.717 15.294 134.676 15.294H134.107V16.0356H133.625V13.5156H134.676C135.003 13.5156 135.255 13.5912 135.432 13.7424C135.61 13.8936 135.699 14.1072 135.699 14.3832C135.699 14.58 135.657 14.748 135.57 14.8872C135.485 15.0264 135.361 15.1308 135.198 15.2004L135.753 16.0356H135.202Z" fill="#0A0A0B"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M134.558 17.3831C135.98 17.3831 137.133 16.2299 137.133 14.8079C137.133 13.3858 135.98 12.2327 134.558 12.2327C133.136 12.2327 131.984 13.3856 131.984 14.8079C131.984 16.2301 133.136 17.3831 134.558 17.3831ZM134.558 12.5332C135.815 12.5332 136.833 13.552 136.833 14.8084C136.833 16.0647 135.815 17.0836 134.558 17.0836C133.302 17.0836 132.284 16.065 132.284 14.8084C132.284 13.5518 133.302 12.5332 134.558 12.5332Z" fill="#0A0A0B"/>
              </svg>
              <h1>Identities</h1>
            </div>
            <button class="btn btn-primary ki-create-btn" data-action="open-create-modal">Create Account</button>
          </div>
          <div class="ki-actions">
            <button class="btn btn-outline-secondary" data-action="reset-token">Change token</button>
            <button class="btn btn-outline-secondary" data-action="refresh" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? '<span class="spinner"></span>&nbsp;Refreshing' : 'Refresh list'}
            </button>
          </div>
        </div>
        ${this.loading && !hasIdentities ? '<p>Loading identities…</p>' : tableMarkup}
      </div>
    `;
  }

  bindEvents() {
    const form = this.shadowRoot.querySelector('#ki-auth-form');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const email = data.get('email')?.toString().trim();
        const password = data.get('password')?.toString().trim();
        if (email && password) {
          this.exchangeToken(email, password);
        }
      });
    }

    const refreshBtn = this.shadowRoot.querySelector('[data-action="refresh"]');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.fetchIdentities());
    }

    const resetBtn = this.shadowRoot.querySelector('[data-action="reset-token"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', (event) => {
        event.preventDefault();
        this.resetToken();
      });
    }

    for (const button of this.shadowRoot.querySelectorAll('[data-action="open-modal"]')) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const id = button.dataset?.identityId;
        if (!id) return;
        const identity = this.identities.find((item) => String(item.id) === id);
        if (identity) {
          this.openEditModal(identity);
        }
      });
    }

    for (const button of this.shadowRoot.querySelectorAll('[data-action="modal-cancel"]')) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this.closeModal();
      });
    }

    const updateBtn = this.shadowRoot.querySelector('[data-action="modal-update"]');
    if (updateBtn) {
      updateBtn.addEventListener('click', () => this.updateIdentity());
    }

    for (const input of this.shadowRoot.querySelectorAll('[data-modal-input]')) {
      const field = input.dataset?.modalInput;
      input.addEventListener('input', (event) => {
        if (!field) return;
        this.handleModalInput(field, event.target.value);
      });
    }

    for (const button of this.shadowRoot.querySelectorAll('[data-action="toggle-section"]')) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const sectionId = button.dataset?.section;
        if (sectionId === 'account-info') {
          if (this.accountInfoExpanded) {
            // If account is open, just toggle it closed
            this.setState({ accountInfoExpanded: false });
          } else {
            // If account is closed, close enroll (if open) and open account
            this.setState({ 
              enrollUserExpanded: false,
              accountInfoExpanded: true 
            });
          }
        } else if (sectionId === 'reset') {
          this.setState({ resetSectionExpanded: !this.resetSectionExpanded });
        }
      });
    }


    const toggleDeviceForm = this.shadowRoot.querySelector('[data-action="toggle-device-form"]');
    if (toggleDeviceForm) {
      toggleDeviceForm.addEventListener('click', () => this.toggleDeviceForm());
    }

    const deviceAdd = this.shadowRoot.querySelector('[data-action="device-add"]');
    if (deviceAdd) {
      deviceAdd.addEventListener('click', () => this.addDevice());
    }

    const deviceStart = this.shadowRoot.querySelector('[data-action="device-start-enroll"]');
    if (deviceStart) {
      deviceStart.addEventListener('click', () => this.startEnroll());
    }

    const deviceSelect = this.shadowRoot.querySelector('[data-action="device-select"]');
    if (deviceSelect) {
      deviceSelect.addEventListener('change', (event) => {
        this.selectedDeviceId = event.target.value;
        this.setState({ selectedDeviceId: this.selectedDeviceId });
      });
    }

    for (const input of this.shadowRoot.querySelectorAll('[data-device-input]')) {
        const field = input.dataset?.deviceInput;
      input.addEventListener('input', (event) => {
        if (!field) return;
        this.handleDeviceFormInput(field, event.target.value);
      });
    }

    const deleteBiometricBtn = this.shadowRoot.querySelector('[data-action="delete-biometric"]');
    if (deleteBiometricBtn) {
      deleteBiometricBtn.addEventListener('click', () => this.confirmDeleteBiometric());
    }

    const deleteAccountBtn = this.shadowRoot.querySelector('[data-action="delete-account"]');
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener('click', () => this.confirmDeleteAccount());
    }

    const openCreateModalBtn = this.shadowRoot.querySelector('[data-action="open-create-modal"]');
    if (openCreateModalBtn) {
      openCreateModalBtn.addEventListener('click', () => this.openCreateModal());
    }

    const createModalCancelBtns = this.shadowRoot.querySelectorAll('[data-action="create-modal-cancel"]');
    createModalCancelBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.closeCreateModal());
    });

    const toggleDemoModeInput = this.shadowRoot.querySelector('[data-action="toggle-demo-mode"]');
    if (toggleDemoModeInput) {
      toggleDemoModeInput.addEventListener('change', () => this.toggleDemoMode());
    }

    for (const input of this.shadowRoot.querySelectorAll('[data-create-input]')) {
      const field = input.dataset?.createInput;
      input.addEventListener('input', (event) => {
        if (!field) return;
        this.handleCreateInput(field, event.target.value);
      });
    }

    const createAccountBtn = this.shadowRoot.querySelector('[data-action="create-account"]');
    if (createAccountBtn) {
      createAccountBtn.addEventListener('click', () => this.createIdentity());
    }

    const createAndEnrollBtn = this.shadowRoot.querySelector('[data-action="create-and-enroll"]');
    if (createAndEnrollBtn) {
      createAndEnrollBtn.addEventListener('click', () => this.createAndEnrollIdentity());
    }

    const createDeviceSelect = this.shadowRoot.querySelector('[data-action="create-device-select"]');
    if (createDeviceSelect) {
      createDeviceSelect.addEventListener('change', (event) => {
        this.selectedDeviceId = event.target.value;
        this.setState({ selectedDeviceId: this.selectedDeviceId });
      });
    }

    for (const input of this.shadowRoot.querySelectorAll('[data-create-device-input]')) {
      const field = input.dataset?.createDeviceInput;
      input.addEventListener('input', (event) => {
        if (!field) return;
        this.handleDeviceFormInput(field, event.target.value);
      });
    }

    const createDeviceAddBtn = this.shadowRoot.querySelector('[data-action="create-device-add"]');
    if (createDeviceAddBtn) {
      createDeviceAddBtn.addEventListener('click', () => this.addDevice());
    }

    const toggleCreateDeviceFormBtn = this.shadowRoot.querySelector('[data-action="toggle-create-device-form"]');
    if (toggleCreateDeviceFormBtn) {
      toggleCreateDeviceFormBtn.addEventListener('click', () => this.toggleCreateDeviceForm());
    }

    // New navigation handlers
    for (const button of this.shadowRoot.querySelectorAll('[data-action="navigate-to-list"]')) {
      button.addEventListener('click', () => {
        this.setState({ currentView: 'list' });
      });
    }

    for (const button of this.shadowRoot.querySelectorAll('[data-action="navigate-to-create"]')) {
      button.addEventListener('click', () => {
        this.setState({ currentView: 'create' });
      });
    }

    for (const element of this.shadowRoot.querySelectorAll('[data-action="open-device-admin"]')) {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        // Close the panel if it's open (e.g., when clicking gear from edit view)
        if (this.panelOpen) {
          this.closePanel();
        }
        this.setState({ currentView: 'device-admin' });
      });
    }

    // Panel handlers - handle both buttons and clickable cells
    for (const element of this.shadowRoot.querySelectorAll('[data-action="open-panel"]')) {
      element.addEventListener('click', (event) => {
        // Only prevent default for buttons, not for clickable cells
        if (element.tagName === 'BUTTON') {
          event.preventDefault();
        }
        const id = element.dataset?.identityId;
        if (!id) return;
        const identity = this.identities.find((item) => String(item.id) === id);
        if (identity) {
          this.openEditPanel(identity);
        }
      });
    }

    for (const button of this.shadowRoot.querySelectorAll('[data-action="close-panel"]')) {
      button.addEventListener('click', () => {
        this.closePanel();
      });
    }

    for (const button of this.shadowRoot.querySelectorAll('[data-action="panel-cancel"]')) {
      button.addEventListener('click', () => {
        this.closePanel();
      });
    }

    // Handle panel-enroll button
    for (const btn of this.shadowRoot.querySelectorAll('[data-action="panel-enroll"]')) {
      // Remove old listener by cloning
      const newBtn = btn.cloneNode(true);
      if (btn.parentNode) {
        btn.parentNode.replaceChild(newBtn, btn);
      }
      newBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!newBtn.disabled && this.panelOpen) {
          this.confirmEnroll();
        }
      });
    }

    // Row-level re-enroll
    for (const button of this.shadowRoot.querySelectorAll('[data-action="re-enroll"]')) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = button.dataset?.identityId;
        if (!id) return;
        const identity = this.identities.find((item) => String(item.id) === id);
        if (identity) {
          // Use the same confirm + enroll flow as the edit panel
          const device = this.getSelectedDevice();
          if (!device) {
            this.setState({ error: 'No device selected. Please select a device first.' });
            return;
          }
          const deviceLabel = this.formatDeviceLabel(device);
          const confirmFn = this.globalScope?.confirm;
          if (confirmFn) {
            const confirmed = confirmFn(
              `Start biometric enrollment on this device: ${deviceLabel}`,
            );
            if (!confirmed) return;
            this.enrollIdentity(identity);
          }
        }
      });
    }

    // Device admin handlers
    for (const input of this.shadowRoot.querySelectorAll('[data-device-admin-input]')) {
      const field = input.dataset?.deviceAdminInput;
      input.addEventListener('input', (event) => {
        if (!field) return;
        this.handleDeviceFormInput(field, event.target.value);
      });
    }

    const deviceAdminAddBtn = this.shadowRoot.querySelector('[data-action="device-admin-add"]');
    if (deviceAdminAddBtn) {
      deviceAdminAddBtn.addEventListener('click', () => this.addDevice());
    }

    for (const button of this.shadowRoot.querySelectorAll('[data-action="edit-device"]')) {
      button.addEventListener('click', (event) => {
        const deviceId = button.dataset?.deviceId;
        if (!deviceId) return;
        const device = this.devices.find(d => d.id === deviceId);
        if (device) {
          this.deviceForm = {
            serial_number: device.serial_number || '',
            device_id: device.device_id || '',
            name: device.name || '',
          };
          this.setState({ deviceForm: this.deviceForm });
        }
      });
    }

    for (const button of this.shadowRoot.querySelectorAll('[data-action="set-default-device"]')) {
      button.addEventListener('click', (event) => {
        const deviceId = button.dataset?.deviceId;
        if (deviceId) {
          this.setDefaultDevice(deviceId);
        }
      });
    }

    for (const button of this.shadowRoot.querySelectorAll('[data-action="delete-device"]')) {
      button.addEventListener('click', (event) => {
        const deviceId = button.dataset?.deviceId;
        if (!deviceId) return;
        if (this.globalScope?.confirm && !confirm('Are you sure you want to delete this device?')) {
          return;
        }
        const storage = this.getStorage();
        const defaultDeviceId = storage?.getItem(this.defaultDeviceKey);
        // If deleting the default device, clear it
        if (defaultDeviceId === deviceId) {
          storage?.removeItem(this.defaultDeviceKey);
        }
        const devices = this.devices.filter(d => d.id !== deviceId);
        this.persistDevices(devices);
        this.deviceForm = { serial_number: '', device_id: '', name: '' };
        this.setState({ devices, deviceForm: this.deviceForm });
      });
    }

  }

  async exchangeToken(email, password, options = {}) {
    const silent = options.silent ?? false;
    if (!email || !password) {
      if (!silent) {
        this.setState({ error: 'email and password are required' });
      }
      throw new Error('email and password are required');
    }
    try {
      if (!silent) {
      this.setState({ loading: true, error: '' });
      }
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || 'Unable to login');
      }

      const data = await response.json();
      if (!data?.access_token) {
        throw new Error('Token response missing access_token');
      }

      this.orgToken = data.access_token;
      const storage = this.getStorage();
      // Always cache immediately
      if (storage) {
        storage.setItem(this.storageKey, this.orgToken);
        const expiry = Date.now() + (data.expires_in ? data.expires_in * 1000 : 1000 * 60 * 60 * 24 * 7);
        storage.setItem(this.tokenExpiryKey, String(expiry));
      }
      if (!silent) {
      this.setState({ loading: false, error: '' });
      this.fetchIdentities();
      }
      return this.orgToken;
    } catch (err) {
      if (!silent) {
      this.setState({ loading: false, error: err.message || 'Login failed' });
      }
      throw err;
    }
  }

  async fetchIdentities() {
    if (!this.orgToken) return;
    if (!this.keyoBase) {
      this.setState({ error: 'Missing Keyo API base URL' });
      return;
    }

    try {
      this.setState({ loading: true, error: '' });
      const base = this.keyoBase.replace(/\/$/, '');
      const response = await fetch(`${base}/v1/identities/`, {
        headers: {
          Authorization: `Bearer ${this.orgToken}`,
          Accept: 'application/json; version=v2',
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          return this.fetchIdentities();
        }
        this.resetToken();
        throw new Error('Token expired. Please login again.');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.detail || 'Unable to load identities');
      }

      const result = await response.json();
      let identities = [];
      if (Array.isArray(result?.results)) {
        identities = result.results;
      } else if (Array.isArray(result)) {
        identities = result;
      }
      this.setState({ identities, loading: false, error: '' });
    } catch (err) {
      this.setState({ loading: false, error: err.message || 'Failed to load identities' });
    }
  }

  resetToken() {
    this.orgToken = null;
    const storage = this.getStorage();
    storage?.removeItem(this.storageKey);
    storage?.removeItem(this.tokenExpiryKey);
    // Remove any access_token if stored separately
    storage?.removeItem('keyoIdentitiesAccessToken');
    this.setState({ identities: [], error: '', deviceSelectorOpen: false, currentView: 'create', panelOpen: false });
  }

  openEditModal(identity) {
    // Convert account_events from array to string if needed (for backward compatibility)
    const metadata = identity.metadata ? { ...identity.metadata } : {};
    if (metadata.account_events && Array.isArray(metadata.account_events)) {
      metadata.account_events = JSON.stringify(metadata.account_events);
    }
    
    const metadataText = JSON.stringify(metadata, null, 2);
    this.setState({
      modalOpen: true,
      activeIdentity: identity,
      modalError: '',
      modalSaving: false,
      deviceSelectorOpen: false,
      accountInfoExpanded: true,
      enrollUserExpanded: false,
      modalForm: {
        first_name: identity.first_name || '',
        middle_name: identity.middle_name || '',
        last_name: identity.last_name || '',
        email: identity.email || '',
        phone: identity.phone || '',
        date_of_birth: identity.date_of_birth || '',
        metadataText,
      },
      modalOriginal: {
        email: identity.email || '',
        phone: identity.phone || '',
      },
      selectedDeviceId: '',
    });
  }

  closeModal() {
    this.setState({
      modalOpen: false,
      activeIdentity: null,
      modalError: '',
      modalSaving: false,
      deviceSelectorOpen: false,
      deviceFormExpanded: false,
      accountInfoExpanded: true,
      enrollUserExpanded: false,
    });
  }

  openEditPanel(identity) {
    // Convert account_events from array to string if needed (for backward compatibility)
    const metadata = identity.metadata ? { ...identity.metadata } : {};
    if (metadata.account_events && Array.isArray(metadata.account_events)) {
      metadata.account_events = JSON.stringify(metadata.account_events);
    }
    
    const metadataText = JSON.stringify(metadata, null, 2);
    const deviceId = this.getAutoSelectedDeviceId();
    this.setState({
      panelOpen: true,
      activeIdentity: identity,
      modalError: '',
      modalSaving: false,
      accountInfoExpanded: true,
      enrollUserExpanded: false,
      enrollModalOpen: false,
      resetSectionExpanded: false,
      selectedDeviceId: deviceId || '',
      modalForm: {
        first_name: identity.first_name || '',
        middle_name: identity.middle_name || '',
        last_name: identity.last_name || '',
        email: identity.email || '',
        phone: identity.phone || '',
        date_of_birth: identity.date_of_birth || '',
        metadataText,
      },
      modalOriginal: {
        email: identity.email || '',
        phone: identity.phone || '',
      },
    });
  }

  closePanel() {
    this.setState({
      panelOpen: false,
      activeIdentity: null,
      modalError: '',
      modalSaving: false,
      accountInfoExpanded: true,
      enrollUserExpanded: false,
      enrollModalOpen: false,
      resetSectionExpanded: false,
    });
  }

  async reEnroll() {
    if (!this.activeIdentity) return;
    await this.reEnrollForIdentity(this.activeIdentity);
  }

  async enrollIdentity(identity) {
    if (!identity) return;
    
    const device = this.getSelectedDevice();
    if (!device) {
      this.setState({ error: 'No device selected. Please select a device first.' });
      return;
    }

    this.setState({ enrollLoading: true });

    try {
      // First delete biometric (always attempt, even if user is new - API returns 400 if no biometric exists, which is fine)
      const base = this.keyoBase.replace(/\/$/, '');
      await fetch(
        `${base}/v1/identities/${identity.id}/delete-biometric/`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.orgToken}`,
            Accept: 'application/json; version=v2',
            'Content-Type': 'application/json',
          },
        },
      );
      // Ignore errors from delete - it's fine if there's no biometric to delete

      // Then immediately start enrollment
      await this.startEnrollForIdentity(identity.id, device.device_id);
      
      // Refresh identities list
      await this.fetchIdentities();
      
      // Close modal and show success
      this.setState({ 
        enrollModalOpen: false,
        enrollLoading: false 
      });
      
      // Show success animation
      this.animateEnrollmentButton('[data-action="panel-enroll"]');
      // Also animate if called from list view
      if (identity?.id) {
        this.animateEnrollmentButton(`[data-action="re-enroll"][data-identity-id="${identity.id}"]`);
      }
    } catch (err) {
      this.logError('Enrolling identity', err);
      this.setState({ 
        enrollLoading: false,
        error: err.message || 'Unable to enroll identity' 
      });
    }
  }

  async reEnrollForIdentity(identity) {
    if (!identity) return;
    
    const device = this.getSelectedDevice();
    if (!device) {
      this.setState({ error: 'No device selected. Please select a device first.' });
      return;
    }

    try {
      // First delete biometric
      const base = this.keyoBase.replace(/\/$/, '');
      const deleteResponse = await fetch(
        `${base}/v1/identities/${identity.id}/delete-biometric/`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.orgToken}`,
            Accept: 'application/json; version=v2',
            'Content-Type': 'application/json',
          },
        },
      );

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json().catch(() => null);
        const detail = this.findDetail(error);
        throw new Error(detail || 'Unable to delete biometric data');
      }

      // Then immediately start enrollment
      await this.startEnrollForIdentity(identity.id, device.device_id);
      
      // Refresh identities list
      await this.fetchIdentities();
      
      // Show success animation
      this.animateEnrollmentButton(`[data-action="re-enroll"][data-identity-id="${identity.id}"]`);
    } catch (err) {
      this.logError('Re-enrolling identity', err);
      this.setState({ error: err.message || 'Unable to re-enroll identity' });
    }
  }

  handleModalInput(field, value) {
    this.modalForm = {
      ...this.modalForm,
      [field]: value,
    };
  }

  openCreateModal() {
    this.setState({
      createModalOpen: true,
      createForm: {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
      },
      createError: '',
      createLoading: false,
      selectedDeviceId: '',
      createDeviceFormExpanded: false,
    });
  }

  closeCreateModal() {
    this.setState({
      createModalOpen: false,
      createForm: {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
      },
      createError: '',
      createLoading: false,
      createDeviceFormExpanded: false,
    });
  }

  toggleCreateDeviceForm() {
    this.setState({
      createDeviceFormExpanded: !this.createDeviceFormExpanded,
    });
  }

  handleCreateInput(field, value) {
    this.createForm = {
      ...this.createForm,
      [field]: value,
    };
    // Update button states dynamically
    this.updateCreateButtonStates();
  }

  updateCreateButtonStates() {
    const firstName = (this.createForm.first_name || '').trim();
    const phone = (this.createForm.phone || '').trim();
    const lastName = (this.createForm.last_name || '').trim();
    const email = (this.createForm.email || '').trim();
    
    let canCreate = false;
    if (this.demoMode) {
      // Demo mode: require first name and phone
      canCreate = firstName.length > 0 && phone.length > 0;
    } else {
      // Non-demo mode: require first name, last name, and at least one of phone or email
      canCreate = firstName.length > 0 && lastName.length > 0 && (phone.length > 0 || email.length > 0);
    }
    
    const autoDeviceId = this.getAutoSelectedDeviceId();
    
    const createAccountBtn = this.shadowRoot.querySelector('[data-action="create-account"]');
    if (createAccountBtn) {
      createAccountBtn.disabled = !canCreate || this.createLoading;
    }
    
    const createAndEnrollBtn = this.shadowRoot.querySelector('[data-action="create-and-enroll"]');
    if (createAndEnrollBtn) {
      createAndEnrollBtn.disabled = !canCreate || !autoDeviceId || this.createLoading;
    }
  }

  async createIdentity() {
    if (this.createLoading) return;

    const firstName = (this.createForm.first_name || '').trim();
    const lastName = (this.createForm.last_name || '').trim();
    const email = (this.createForm.email || '').trim();
    const phone = (this.createForm.phone || '').trim();
    const dateOfBirth = (this.createForm.date_of_birth || '').trim();

    if (!firstName) {
      this.setState({ createError: 'First name is required.' });
      return;
    }

    if (this.demoMode) {
      // Demo mode: require phone
      if (!phone) {
        this.setState({ createError: 'Phone number is required.' });
        return;
      }
      const phoneRegex = /^\+\d{1,15}$/;
      if (!phoneRegex.test(phone)) {
        this.setState({
          createError: 'Phone numbers must start with + and include up to 15 digits.',
        });
        return;
      }
    } else {
      // Non-demo mode: require last name, and at least one of phone or email
      if (!lastName) {
        this.setState({ createError: 'Last name is required.' });
        return;
      }
      if (!phone && !email) {
        this.setState({ createError: 'Either phone number or email is required.' });
        return;
      }
      if (phone) {
        const phoneRegex = /^\+\d{1,15}$/;
        if (!phoneRegex.test(phone)) {
          this.setState({
            createError: 'Phone numbers must start with + and include up to 15 digits.',
          });
          return;
        }
      }
    }

    // Parse user-provided metadata if present
    let parsedMetadata = {};
    if (this.createForm.metadataText && this.createForm.metadataText.trim()) {
      try {
        parsedMetadata = JSON.parse(this.createForm.metadataText);
      } catch (err) {
        this.logError('Parsing metadata', err);
        this.setState({ createError: 'Metadata must be valid JSON.' });
        return;
      }
    }

    // Merge with default metadata
    const metadata = {
      created_by: 'agency_app',
      created_at: new Date().toISOString(),
      ...parsedMetadata,
    };
    const metadataWithEvent = this.addAccountEvent(metadata, 'CREATE_ACCOUNT');

    const payload = {
      first_name: firstName,
      last_name: this.demoMode ? 'IdentitiesUI' : lastName,
      metadata: metadataWithEvent,
    };

    if (phone) {
      payload.phone = phone;
    }
    if (!this.demoMode && email) {
      payload.email = email;
    }
    if (!this.demoMode && dateOfBirth) {
      payload.date_of_birth = dateOfBirth;
    }

    try {
      this.setState({ createLoading: true, createError: '' });
      const base = this.keyoBase.replace(/\/$/, '');
      const response = await fetch(`${base}/v1/identities/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.orgToken}`,
          Accept: 'application/json; version=v2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const detail = this.findDetail(error);
        throw new Error(detail || 'Failed to create identity account');
      }

      const newIdentity = await response.json();
      this.setState({
        identities: [...this.identities, newIdentity],
        createLoading: false,
        createError: '',
        createForm: {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          date_of_birth: '',
          metadataText: '',
        },
      });
    } catch (err) {
      this.setState({
        createLoading: false,
        createError: err.message || 'Unable to create identity account',
      });
    }
  }

  async createAndEnrollIdentity() {
    if (this.createLoading) return;

    const deviceId = this.getAutoSelectedDeviceId();
    if (!deviceId) {
      this.setState({ createError: 'Please add a device first.' });
      return;
    }

    const selectedDevice = this.devices.find((d) => d.id === deviceId);
    if (!selectedDevice || !selectedDevice.device_id) {
      this.setState({ createError: 'Selected device is invalid.' });
      return;
    }

    try {
      this.setState({ createLoading: true, createError: '' });
      const newIdentity = await this.createIdentityInternal();
      await this.startEnrollForIdentity(newIdentity.id, selectedDevice.device_id);
      this.setState({
        identities: [...this.identities, newIdentity],
        createLoading: false,
        createError: '',
        createForm: {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          date_of_birth: '',
          metadataText: '',
        },
      });
      
      // Animate button on success
      this.animateEnrollmentButton('[data-action="create-and-enroll"]');
    } catch (err) {
      this.setState({
        createLoading: false,
        createError: err.message || 'Unable to create and enroll identity',
      });
    }
  }

  async createIdentityInternal() {
    const firstName = (this.createForm.first_name || '').trim();
    const lastName = (this.createForm.last_name || '').trim();
    const email = (this.createForm.email || '').trim();
    const phone = (this.createForm.phone || '').trim();
    const dateOfBirth = (this.createForm.date_of_birth || '').trim();

    // Parse user-provided metadata if present
    let parsedMetadata = {};
    if (this.createForm.metadataText && this.createForm.metadataText.trim()) {
      try {
        parsedMetadata = JSON.parse(this.createForm.metadataText);
      } catch (err) {
        this.logError('Parsing metadata', err);
        throw new Error('Metadata must be valid JSON.');
      }
    }

    // Merge with default metadata
    const metadata = {
      created_by: 'agency_app',
      created_at: new Date().toISOString(),
      ...parsedMetadata,
    };
    const metadataWithEvent = this.addAccountEvent(metadata, 'CREATE_ACCOUNT');

    const payload = {
      first_name: firstName,
      last_name: this.demoMode ? 'IdentitiesUI' : lastName,
      metadata: metadataWithEvent,
    };

    if (phone) {
      payload.phone = phone;
    }
    if (!this.demoMode && email) {
      payload.email = email;
    }
    if (!this.demoMode && dateOfBirth) {
      payload.date_of_birth = dateOfBirth;
    }

    const base = this.keyoBase.replace(/\/$/, '');
    const response = await fetch(`${base}/v1/identities/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.orgToken}`,
        Accept: 'application/json; version=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = this.findDetail(error);
      throw new Error(detail || 'Failed to create identity account');
    }

    return response.json();
  }

  async startEnrollForIdentity(identityId, deviceId) {
    const base = this.keyoBase.replace(/\/$/, '');
    const response = await fetch(`${base}/v1/identities/${identityId}/start-enroll/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.orgToken}`,
        Accept: 'application/json; version=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_id: deviceId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = this.findDetail(error);
      throw new Error(detail || 'Failed to start enrollment');
    }

    // Save last selected device
    const device = this.devices.find(d => d.device_id === deviceId);
    if (device) {
      this.saveLastSelectedDevice(device.id);
    }

    // Add ENROLL_BIOMETRIC event to metadata
    try {
      const identityResponse = await fetch(`${base}/v1/identities/${identityId}/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.orgToken}`,
          Accept: 'application/json; version=v2',
        },
      });
      if (identityResponse.ok) {
        const identity = await identityResponse.json();
        const currentMetadata = identity.metadata || {};
        const metadataWithEvent = this.addAccountEvent(currentMetadata, 'ENROLL_BIOMETRIC');
        await fetch(`${base}/v1/identities/${identityId}/`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.orgToken}`,
            Accept: 'application/json; version=v2',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ metadata: metadataWithEvent }),
        });
      }
    } catch (err) {
      this.logError('Adding enroll event to metadata', err);
      // Don't throw - enrollment succeeded, metadata update is secondary
    }

    return response.json();
  }

  renderDeviceAdminView() {
    const header = this.renderHeader();
    // Use the same logic as getAutoSelectedDeviceId to determine which device is the "active" default
    const activeDeviceId = this.getAutoSelectedDeviceId();
    
    const deviceRows = this.devices.map((device, index) => {
      const isDefault = device.id === activeDeviceId;
      const starIcon = isDefault ? `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="20" height="20" fill="currentColor" class="ki-star-icon filled">
          <path d="M309.5-18.9c-4.1-8-12.4-13.1-21.4-13.1s-17.3 5.1-21.4 13.1L193.1 125.3 33.2 150.7c-8.9 1.4-16.3 7.7-19.1 16.3s-.5 18 5.8 24.4l114.4 114.5-25.2 159.9c-1.4 8.9 2.3 17.9 9.6 23.2s16.9 6.1 25 2L288.1 417.6 432.4 491c8 4.1 17.7 3.3 25-2s11-14.2 9.6-23.2L441.7 305.9 556.1 191.4c6.4-6.4 8.6-15.8 5.8-24.4s-10.1-14.9-19.1-16.3L383 125.3 309.5-18.9z"/>
        </svg>
      ` : `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="20" height="20" fill="currentColor" class="ki-star-icon empty">
          <path d="M288.1-32c9 0 17.3 5.1 21.4 13.1L383 125.3 542.9 150.7c8.9 1.4 16.3 7.7 19.1 16.3s.5 18-5.8 24.4L441.7 305.9 467 465.8c1.4 8.9-2.3 17.9-9.6 23.2s-17 6.1-25 2L288.1 417.6 143.8 491c-8 4.1-17.7 3.3-25-2s-11-14.2-9.6-23.2L134.4 305.9 20 191.4c-6.4-6.4-8.6-15.8-5.8-24.4s10.1-14.9 19.1-16.3l159.9-25.4 73.6-144.2c4.1-8 12.4-13.1 21.4-13.1zm0 76.8L230.3 158c-3.5 6.8-10 11.6-17.6 12.8l-125.5 20 89.8 89.9c5.4 5.4 7.9 13.1 6.7 20.7l-19.8 125.5 113.3-57.6c6.8-3.5 14.9-3.5 21.8 0l113.3 57.6-19.8-125.5c-1.2-7.6 1.3-15.3 6.7-20.7l89.8-89.9-125.5-20c-7.6-1.2-14.1-6-17.6-12.8L288.1 44.8z"/>
        </svg>
      `;
      
      return `
      <tr>
        <td class="text-center">
          <button class="ki-star-button" data-action="set-default-device" data-device-id="${this.escapeHtml(device.id)}" title="${isDefault ? 'Default device' : 'Set as default device'}">
            ${starIcon}
          </button>
        </td>
        <td>${this.escapeHtml(device.serial_number || '—')}</td>
        <td>${this.escapeHtml(device.device_id || '—')}</td>
        <td>${this.escapeHtml(device.name || '—')}</td>
        <td class="text-end">
          <button class="btn btn-outline-secondary btn-sm ki-btn-large" data-action="edit-device" data-device-id="${this.escapeHtml(device.id)}">Edit</button>
          <button class="btn btn-outline-secondary btn-sm ki-btn-large" data-action="delete-device" data-device-id="${this.escapeHtml(device.id)}">Delete</button>
        </td>
      </tr>
    `;
    }).join('') || '<tr><td colspan="5">No devices saved. Add a device below.</td></tr>';

    return `
      <div>
        ${header}
        <div class="ki-list-header">
          <button class="btn btn-outline-secondary" data-action="navigate-to-create">← Back to Create</button>
          <button class="btn btn-outline-secondary" data-action="navigate-to-list">← Back to List</button>
        </div>
        <h2>Device Management</h2>
        <div class="table-responsive">
          <table class="table table-striped align-middle">
            <thead>
              <tr>
                <th class="text-center">Is default</th>
                <th>Serial Number</th>
                <th>Device ID</th>
                <th>Name</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${deviceRows}
            </tbody>
          </table>
        </div>
        <div class="ki-device-form-section">
          <h3>Add New Device</h3>
          <div class="ki-device-form-row">
            <div class="ki-device-form-field">
              <label>
                Serial Num. *
                <input class="form-control" data-device-admin-input="serial_number" placeholder="f6g4abcd" value="${this.escapeAttribute(this.deviceForm.serial_number)}" />
              </label>
            </div>
            <div class="ki-device-form-field">
              <label>
                Device ID *
                <input class="form-control" data-device-admin-input="device_id" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="374" value="${this.escapeAttribute(this.deviceForm.device_id)}" />
              </label>
            </div>
            <div class="ki-device-form-field">
              <label>
                Name
                <input class="form-control" data-device-admin-input="name" placeholder="Front Office" value="${this.escapeAttribute(this.deviceForm.name)}" />
              </label>
            </div>
          </div>
          <button id="add-new-device" class="btn btn-primary ki-btn-large" data-action="device-admin-add" ${!(this.deviceForm.serial_number?.trim() && this.deviceForm.device_id?.trim()) ? 'disabled' : ''}>
            Save Device
          </button>
        </div>
      </div>
    `;
  }

  renderSlidingPanel() {
    if (!this.panelOpen || !this.activeIdentity) {
      return '';
    }

    const accountInfoContent = `
      <div class="ki-form-row">
        <div class="ki-form-field">
          ${this.renderField('First Name', 'first_name', this.modalForm.first_name)}
        </div>
        <div class="ki-form-field">
          ${this.renderField('Last Name', 'last_name', this.modalForm.last_name)}
        </div>
      </div>
      <div class="ki-form-row">
        <div class="ki-form-field">
          ${this.renderField('Phone', 'phone', this.modalForm.phone)}
        </div>
        <div class="ki-form-field">
          ${this.renderField('Email', 'email', this.modalForm.email)}
        </div>
      </div>
      <div class="ki-form-row ki-form-row-single">
        <div class="ki-form-field">
          ${this.renderField('Date of Birth', 'date_of_birth', this.modalForm.date_of_birth, 'date')}
        </div>
      </div>
      <div class="ki-field">
        <label>
          Metadata (JSON)
          <textarea class="form-control ki-textarea" data-modal-input="metadataText">${this.escapeHtml(this.modalForm.metadataText)}</textarea>
        </label>
      </div>
      <div class="ki-account-actions">
        <div class="ki-account-actions-row">
          <button class="btn btn-outline-secondary" data-action="panel-cancel" type="button">Cancel</button>
          <button class="btn btn-primary" data-action="modal-update" type="button" ${this.modalSaving ? 'disabled' : ''}>
            ${this.modalSaving ? '<span class="spinner"></span>&nbsp;Updating' : 'Update'}
          </button>
        </div>
        <div class="ki-enroll-action-row">
          <button class="btn btn-outline-secondary" data-action="panel-enroll" type="button" ${!this.getAutoSelectedDeviceId() || this.enrollLoading ? 'disabled' : ''}>
            ${this.enrollLoading ? '<span class="spinner"></span>&nbsp;Enrolling' : 'Enroll'}
          </button>
        </div>
      </div>
    `;

    const selectedDevice = this.getSelectedDevice();
    const deviceId = selectedDevice ? selectedDevice.id : '';
    
    const resetContent = `
      <div class="ki-reset-actions">
        <button class="btn ki-btn-danger btn-sm ki-btn-large" type="button" data-action="delete-biometric">
          Delete Biometric
        </button>
        <button class="btn ki-btn-danger btn-sm ki-btn-large" type="button" data-action="delete-account">
          Delete Account
        </button>
      </div>
    `;

    return `
      <div class="ki-sliding-panel-backdrop ${this.panelOpen ? 'open' : ''}" data-action="close-panel"></div>
      <div class="ki-sliding-panel ${this.panelOpen ? 'open' : ''}">
        <div class="ki-sliding-panel-header">
          <h2>Edit ${this.escapeHtml(this.modalForm.first_name || this.modalForm.last_name || 'Identity')}</h2>
          <button class="ki-modal-close" data-action="close-panel" aria-label="Close">&times;</button>
        </div>
        <div class="ki-sliding-panel-device-display">
          ${this.renderDeviceDisplay()}
        </div>
        <div class="ki-sliding-panel-body">
          ${
            this.modalError
              ? `<div class="alert alert-danger ki-modal-error-top">${this.escapeHtml(this.modalError)}</div>`
              : ''
          }
          ${this.renderCollapsibleSection('Account Info', 'account-info', this.accountInfoExpanded, accountInfoContent)}
          ${this.renderCollapsibleSection('Reset', 'reset', this.resetSectionExpanded, resetContent)}
        </div>
      </div>
    `;
  }

  renderEnrollModal() {
    if (!this.enrollModalOpen || !this.activeIdentity) {
      return '';
    }

    const device = this.getSelectedDevice();
    const deviceLabel = device ? this.formatDeviceLabel(device) : 'No device selected';

    return `
      <div class="ki-modal-backdrop" data-action="close-enroll-modal">
        <div class="ki-modal">
          <div class="ki-modal-header">
            <h2>Enroll Identity</h2>
            <button class="ki-modal-close" data-action="close-enroll-modal" aria-label="Close">&times;</button>
          </div>
          <div class="ki-modal-body">
            <p>Start biometric enrollment on this device: <strong>${this.escapeHtml(deviceLabel)}</strong></p>
          </div>
          <div class="ki-modal-footer">
            <button class="btn btn-outline-secondary" data-action="close-enroll-modal" type="button">Cancel</button>
            <button class="btn btn-primary" data-action="enroll-modal-ok" type="button" ${!device ? 'disabled' : ''}>
              OK
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderModal() {
    if (!this.modalOpen || !this.activeIdentity) {
      return '';
    }

    const accountInfoContent = `
      <div class="ki-form-row">
        <div class="ki-form-field">
          ${this.renderField('First Name', 'first_name', this.modalForm.first_name)}
        </div>
        <div class="ki-form-field">
          ${this.renderField('Last Name', 'last_name', this.modalForm.last_name)}
        </div>
        <div class="ki-form-field">
          ${this.renderField('Phone', 'phone', this.modalForm.phone)}
        </div>
      </div>
      <div class="ki-form-row">
        <div class="ki-form-field">
          ${this.renderField('Email', 'email', this.modalForm.email)}
        </div>
        <div class="ki-form-field">
          ${this.renderField('Date of Birth', 'date_of_birth', this.modalForm.date_of_birth, 'date')}
        </div>
      </div>
      <div class="ki-field">
        <label>
          Metadata (JSON)
          <textarea class="form-control ki-textarea" data-modal-input="metadataText">${this.escapeHtml(this.modalForm.metadataText)}</textarea>
        </label>
      </div>
      <div class="ki-account-actions">
        <button class="btn btn-outline-secondary" data-action="modal-cancel" type="button">Cancel</button>
        <button class="btn btn-primary" data-action="modal-update" type="button" ${this.modalSaving ? 'disabled' : ''}>
          ${
            this.modalSaving
              ? '<span class="spinner"></span>&nbsp;Updating'
              : 'Update'
          }
        </button>
      </div>
    `;

    return `
      <div class="ki-modal-backdrop">
        <div class="ki-modal">
          <div class="ki-modal-header">
            <h2>Edit ${this.escapeHtml(this.modalForm.first_name || this.modalForm.last_name || 'Identity')}</h2>
            <button class="ki-modal-close" data-action="modal-cancel" aria-label="Close">&times;</button>
          </div>
          <div class="ki-modal-body">
            ${
              this.modalError
                ? `<div class="alert alert-danger ki-modal-error-top">${this.escapeHtml(this.modalError)}</div>`
                : ''
            }
            ${this.renderCollapsibleSection('Account Info', 'account-info', this.accountInfoExpanded, accountInfoContent)}
            ${this.renderCollapsibleSection('Enroll User', 'enroll-user', this.enrollUserExpanded, this.renderEnrollSection())}
          </div>
          <section class="ki-danger">
            <h3>Danger</h3>
            <div class="ki-danger-item">
              <button class="btn ki-btn-danger" type="button" data-action="delete-biometric">Delete Biometric</button>
              <span>Delete biometric data only.</span>
            </div>
            <div class="ki-danger-item">
              <button class="btn ki-btn-danger" type="button" data-action="delete-account">Delete Account</button>
              <span>Delete biometric data and the account.</span>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  renderCollapsibleSection(title, sectionId, isExpanded, content) {
    const resetClass = sectionId === 'reset' ? 'ki-collapsible-section-reset' : '';
    return `
      <div class="ki-collapsible-section ${resetClass}">
        <button
          class="ki-collapsible-header"
          type="button"
          data-action="toggle-section"
          data-section="${sectionId}"
        >
          <span class="ki-collapsible-icon">
            ${
              isExpanded
                ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M169.4 137.4c12.5-12.5 32.8-12.5 45.3 0l160 160c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L192 205.3 54.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160z"/></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/></svg>'
            }
          </span>
          <span>${this.escapeHtml(title)}</span>
        </button>
        ${
          isExpanded
            ? `<div class="ki-collapsible-content">
                ${content}
              </div>`
            : ''
        }
      </div>
    `;
  }

  renderEnrollSection() {
    const hasDevices = Array.isArray(this.devices) && this.devices.length > 0;
    const options = hasDevices
      ? `<option value="">Choose a device</option>` +
        this.devices
          .map(
            (device) => `
        <option value="${device.id}" ${this.selectedDeviceId === device.id ? 'selected' : ''}>
          ${this.escapeHtml(this.formatDeviceLabel(device))}
        </option>`,
          )
          .join('')
      : '';

    const canSaveDevice = (this.deviceForm.serial_number || '').trim() && (this.deviceForm.device_id || '').trim();

    return `
      <div class="ki-device-select ki-device-select-full">
        <select class="form-select ki-device-select-full" data-action="device-select" ${hasDevices ? '' : 'disabled'}>
          ${hasDevices ? options : '<option>No devices saved</option>'}
        </select>
      </div>
      <div class="ki-device-buttons-row">
        <button
          class="btn btn-primary btn-sm ki-device-button"
          type="button"
          data-action="device-start-enroll"
          ${!this.selectedDeviceId || this.enrollLoading ? 'disabled' : ''}
        >
          ${
            this.enrollLoading
              ? '<span class="spinner"></span>&nbsp;Starting'
              : 'Start Enrollment'
          }
        </button>
        <button
          class="btn btn-outline-secondary btn-sm ki-device-button"
          type="button"
          data-action="device-close"
        >
          Cancel
        </button>
      </div>
      <div class="ki-device-section add-new">
        <h5 class="ki-device-section-title">Add New Device</h5>
        <div class="ki-device-form-row">
          <div class="ki-device-form-field">
            <label>
              Serial Num *
              <input
                class="form-control"
                data-device-input="serial_number"
                placeholder="f6g4abcd"
                value="${this.escapeAttribute(this.deviceForm.serial_number)}"
              />
            </label>
          </div>
          <div class="ki-device-form-field">
            <label>
              Device ID *
              <input
                class="form-control"
                data-device-input="device_id"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                placeholder="374"
                value="${this.escapeAttribute(this.deviceForm.device_id)}"
              />
            </label>
          </div>
          <div class="ki-device-form-field">
            <label>
              Name
              <input
                class="form-control"
                data-device-input="name"
                placeholder="Front Office"
                value="${this.escapeAttribute(this.deviceForm.name)}"
              />
            </label>
          </div>
        </div>
        <div class="ki-device-save-wrapper">
          <button
            class="btn btn-outline-secondary btn-sm ki-device-save-button"
            type="button"
            data-action="device-add"
            ${!canSaveDevice ? 'disabled' : ''}
          >
            Save
          </button>
        </div>
      </div>
    `;
  }

  renderCreateModal() {
    if (!this.createModalOpen) {
      return '';
    }

    const hasDevices = Array.isArray(this.devices) && this.devices.length > 0;
    const deviceOptions = hasDevices
      ? `<option value="">Choose a device</option>` +
        this.devices
          .map(
            (device) => `
        <option value="${device.id}" ${this.selectedDeviceId === device.id ? 'selected' : ''}>
          ${this.escapeHtml(this.formatDeviceLabel(device))}
        </option>`,
          )
          .join('')
      : '';

    const canSaveDevice = (this.deviceForm.serial_number || '').trim() && (this.deviceForm.device_id || '').trim();

    return `
      <div class="ki-modal-backdrop">
        <div class="ki-modal">
          <div class="ki-modal-header">
            <h2>Create Account</h2>
            <div class="ki-demo-mode-container">
              <label class="ki-demo-mode-label ${this.demoMode ? 'enabled' : 'disabled'}" for="demo-mode-toggle">
                Demo mode
              </label>
              <label class="ki-toggle-switch">
                <input
                  type="checkbox"
                  id="demo-mode-toggle"
                  data-action="toggle-demo-mode"
                  ${this.demoMode ? 'checked' : ''}
                />
                <span class="ki-toggle-slider"></span>
              </label>
            </div>
            <button class="ki-modal-close" data-action="create-modal-cancel" aria-label="Close">&times;</button>
          </div>
          <div class="ki-modal-body">
            ${
              this.demoMode
                ? `
            <div class="ki-form-row">
              <div class="ki-form-field">
                ${this.renderField('First Name', 'first_name', this.createForm.first_name, 'text', 'create', true)}
              </div>
              <div class="ki-form-field">
                ${this.renderField('Phone', 'phone', this.createForm.phone, 'tel', 'create', true)}
              </div>
            </div>
            <input type="hidden" name="last_name" value="IdentitiesUI" />
            `
                : `
            <div class="ki-form-row">
              <div class="ki-form-field">
                ${this.renderField('First Name', 'first_name', this.createForm.first_name, 'text', 'create', true)}
              </div>
              <div class="ki-form-field">
                ${this.renderField('Last Name', 'last_name', this.createForm.last_name, 'text', 'create', true)}
              </div>
              <div class="ki-form-field">
                ${this.renderField('Phone', 'phone', this.createForm.phone, 'tel', 'create', false)}
              </div>
            </div>
            <div class="ki-form-row">
              <div class="ki-form-field">
                ${this.renderField('Email', 'email', this.createForm.email, 'email', 'create', false)}
              </div>
              <div class="ki-form-field">
                ${this.renderField('Date of Birth', 'date_of_birth', this.createForm.date_of_birth || '', 'date', 'create', false)}
              </div>
            </div>
            `
            }
            <div class="ki-device-section">
              <h4 class="ki-device-section-title">Select device</h4>
              <div class="ki-create-device-section">
                <div class="ki-device-select ki-create-device-select">
                  <select class="form-select ki-device-select-full" data-action="create-device-select" ${hasDevices ? '' : 'disabled'}>
                    ${hasDevices ? deviceOptions : '<option>No devices saved</option>'}
                  </select>
                </div>
                <div class="ki-create-device-buttons">
                  <button
                    class="btn btn-outline-secondary btn-sm ki-create-device-button"
                    type="button"
                    data-action="create-account"
                    ${this.createLoading ? 'disabled' : ''}
                  >
                    ${this.createLoading ? '<span class="spinner"></span>&nbsp;Creating' : 'Create account'}
                  </button>
                  <button
                    class="btn btn-primary btn-sm ki-create-device-button"
                    type="button"
                    data-action="create-and-enroll"
                    ${!this.selectedDeviceId || this.createLoading ? 'disabled' : ''}
                  >
                    ${this.createLoading ? '<span class="spinner"></span>&nbsp;Creating' : 'Create and enroll'}
                  </button>
                </div>
              </div>
              ${
                hasDevices
                  ? ''
                  : '<div class="ki-device-empty-light">Add a device below to enable enrollment.</div>'
              }
            </div>
            <div class="ki-device-section add-new">
              <h5 class="ki-device-section-title">Add New Device</h5>
              <div class="ki-create-device-form">
                <div class="ki-device-form-field">
                  <label>
                    Serial Num. *
                    <input
                      class="form-control"
                      data-create-device-input="serial_number"
                      placeholder="f6g4abcd"
                      value="${this.escapeAttribute(this.deviceForm.serial_number)}"
                    />
                  </label>
                </div>
                <div class="ki-device-form-field">
                  <label>
                    Device ID *
                    <input
                      class="form-control"
                      data-create-device-input="device_id"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      placeholder="374"
                      value="${this.escapeAttribute(this.deviceForm.device_id)}"
                    />
                  </label>
                </div>
                <div class="ki-device-form-field">
                  <label>
                    Name
                    <input
                      class="form-control"
                      data-create-device-input="name"
                      placeholder="Front Office"
                      value="${this.escapeAttribute(this.deviceForm.name)}"
                    />
                  </label>
                </div>
              </div>
              <div class="ki-device-save-wrapper">
                <button
                  class="btn btn-outline-secondary btn-sm ki-device-save-button"
                  type="button"
                  data-action="create-device-add"
                  ${!canSaveDevice ? 'disabled' : ''}
                >
                  Save
                </button>
              </div>
            </div>
            ${
              this.createError
                ? `<div class="alert alert-danger ki-error-message">${this.escapeHtml(this.createError)}</div>`
                : ''
            }
          </div>
          <div class="ki-modal-footer">
            <button class="btn btn-outline-secondary" data-action="create-modal-cancel" type="button">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  renderField(label, field, value, type = 'text', formType = 'edit', required = false) {
    let resolvedType = type;
    let extraAttributes = '';

    if (field === 'email') {
      resolvedType = 'email';
    }
    if (field === 'phone') {
      resolvedType = 'tel';
      extraAttributes = String.raw` inputmode="tel" pattern="\+\d{1,15}" placeholder="+123456789012345" maxlength="16"`;
    }

    if (required) {
      extraAttributes += ' required';
    }

    const inputAttr = formType === 'create' ? 'data-create-input' : 'data-modal-input';
    return `
      <div class="ki-field">
        <label>
          <span>${label}${required ? '<span class="ki-required-asterisk">*</span>' : ''}</span>
          <input
            class="form-control"
            ${inputAttr}="${field}"
            type="${resolvedType}"
            ${extraAttributes}
            value="${this.escapeAttribute(value)}"
          />
        </label>
      </div>
    `;
  }

  renderDeviceSelector() {
    if (!this.deviceSelectorOpen) return '';
    const hasDevices = Array.isArray(this.devices) && this.devices.length > 0;
    const options = hasDevices
      ? `<option value="">Choose a device</option>` +
        this.devices
          .map(
            (device) => `
        <option value="${device.id}" ${this.selectedDeviceId === device.id ? 'selected' : ''}>
          ${this.escapeHtml(this.formatDeviceLabel(device))}
        </option>`,
          )
          .join('')
      : '';

    const canSaveDevice = (this.deviceForm.serial_number || '').trim() && (this.deviceForm.device_id || '').trim();

    return `
      <div class="ki-modal-body enroll">
        <div class="ki-device-select ki-device-select-full">
          <select class="form-select ki-device-select-full" data-action="device-select" ${hasDevices ? '' : 'disabled'}>
            ${hasDevices ? options : '<option>No devices saved</option>'}
          </select>
        </div>
        <div class="ki-device-buttons-row">
          <button
            class="btn btn-primary btn-sm ki-device-button"
            type="button"
            data-action="device-start-enroll"
            ${!this.selectedDeviceId || this.enrollLoading ? 'disabled' : ''}
          >
            ${
              this.enrollLoading
                ? '<span class="spinner"></span>&nbsp;Starting'
                : 'Start Enrollment'
            }
          </button>
          <button
            class="btn btn-outline-secondary btn-sm ki-device-button"
            type="button"
            data-action="device-close"
          >
            Cancel
          </button>
        </div>
        <div class="ki-device-section add-new">
          <button
            class="ki-device-toggle"
            type="button"
            data-action="toggle-device-form"
          >
            <h5 class="ki-device-section-title">Add New Device</h5>
            <span class="ki-collapsible-icon">
              ${
                this.deviceFormExpanded
                  ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M169.4 137.4c12.5-12.5 32.8-12.5 45.3 0l160 160c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L192 205.3 54.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160z"/></svg>'
                  : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/></svg>'
              }
            </span>
          </button>
          ${
            this.deviceFormExpanded
              ? `
          <div class="ki-device-form-row">
            <div class="ki-device-form-field">
              <label>
                Serial Num. *
                <input
                  class="form-control"
                  data-device-input="serial_number"
                  placeholder="f6g4abcd"
                  value="${this.escapeAttribute(this.deviceForm.serial_number)}"
                />
              </label>
            </div>
            <div class="ki-device-form-field">
              <label>
                Device ID *
                <input
                  class="form-control"
                  data-device-input="device_id"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  placeholder="374"
                  value="${this.escapeAttribute(this.deviceForm.device_id)}"
                />
              </label>
            </div>
            <div class="ki-device-form-field">
              <label>
                Name
                <input
                  class="form-control"
                  data-device-input="name"
                  placeholder="Front Office"
                  value="${this.escapeAttribute(this.deviceForm.name)}"
                />
              </label>
            </div>
          </div>
          <div class="ki-device-save-wrapper">
            <button
              class="btn btn-outline-secondary btn-sm ki-device-save-button"
              type="button"
              data-action="device-add"
              ${!canSaveDevice ? 'disabled' : ''}
            >
              Save
            </button>
          </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  async updateIdentity() {
    if (!this.activeIdentity || this.modalSaving) return;

    let parsedMetadata = {};
    try {
      parsedMetadata = this.modalForm.metadataText
        ? JSON.parse(this.modalForm.metadataText)
        : {};
    } catch (err) {
      this.logError('Parsing metadata', err);
      this.setState({ modalError: 'Metadata must be valid JSON.' });
      return;
    }

    const metadataWithEvent = this.addAccountEvent(parsedMetadata, 'UPDATE_ACCOUNT');

    const payload = {
      metadata: metadataWithEvent,
    };

    const assignIfPresent = (key, value) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'string') {
        if (value.trim() === '') return;
      }
      payload[key] = value;
    };

    assignIfPresent('first_name', this.modalForm.first_name);
    assignIfPresent('middle_name', this.modalForm.middle_name);
    assignIfPresent('last_name', this.modalForm.last_name);
    assignIfPresent('date_of_birth', this.modalForm.date_of_birth);

    const normalizedEmail = (this.modalForm.email || '').trim();
    const originalEmail = (this.modalOriginal.email || '').trim();
    if (normalizedEmail !== originalEmail) {
      payload.email = normalizedEmail ? this.modalForm.email : ' ';
    }

    const normalizedPhone = (this.modalForm.phone || '').trim();
    const originalPhone = (this.modalOriginal.phone || '').trim();
    const phoneRegex = /^\+\d{1,15}$/;
    if (normalizedPhone && !phoneRegex.test(normalizedPhone)) {
      this.setState({
        modalError: 'Phone numbers must start with + and include up to 15 digits.',
      });
      return;
    }
    if (normalizedPhone !== originalPhone) {
      payload.phone = normalizedPhone || ' ';
    }

    try {
      this.setState({ modalSaving: true, modalError: '' });
      const base = this.keyoBase.replace(/\/$/, '');
      const response = await fetch(`${base}/v1/identities/${this.activeIdentity.id}/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.orgToken}`,
          Accept: 'application/json; version=v2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const detail = this.findDetail(error);
        throw new Error(detail || 'Update failed');
      }

      const updatedIdentity = await response.json();
      const updatedList = this.identities.map((identity) =>
        identity.id === updatedIdentity.id ? updatedIdentity : identity,
      );

      this.setState({
        identities: updatedList,
        modalOpen: false,
        modalSaving: false,
        modalError: '',
        activeIdentity: null,
      });
    } catch (err) {
      this.logError('Updating identity request', err);
      this.setState({
        modalSaving: false,
        modalError: err.message || 'Unable to update identity',
      });
    }
  }

  toggleDeviceSelector() {
    const nextState = !this.deviceSelectorOpen;
    this.setState({
      deviceSelectorOpen: nextState,
      deviceFormExpanded: false,
    });
  }

  closeDeviceSelector() {
    this.setState({ deviceSelectorOpen: false, deviceFormExpanded: false });
  }

  toggleDeviceForm() {
    this.setState({ deviceFormExpanded: !this.deviceFormExpanded });
  }

  handleDeviceFormInput(field, value) {
    // For device_id, only allow numeric characters
    if (field === 'device_id') {
      value = value.replace(/\D/g, '');
      // Update the input value directly in the DOM to reflect filtered value
      // Check both data-device-input and data-device-admin-input
      const input = this.shadowRoot.querySelector(`[data-device-input="${field}"]`) || 
                    this.shadowRoot.querySelector(`[data-device-admin-input="${field}"]`);
      if (input && input.value !== value) {
        input.value = value;
      }
    }
    this.deviceForm = {
      ...this.deviceForm,
      [field]: value,
    };
    // Update Save button disabled state without re-rendering
    // Check both device-add (modal/panel) and device-admin-add (admin screen) buttons
    const canSave = (this.deviceForm.serial_number || '').trim() && (this.deviceForm.device_id || '').trim();
    
    const saveBtn = this.shadowRoot.querySelector('[data-action="device-add"]');
    if (saveBtn) {
      saveBtn.disabled = !canSave;
    }
    
    const adminSaveBtn = this.shadowRoot.querySelector('[data-action="device-admin-add"]');
    if (adminSaveBtn) {
      adminSaveBtn.disabled = !canSave;
    }
  }

  addDevice() {
    const serial = this.deviceForm.serial_number.trim();
    const deviceId = this.deviceForm.device_id.trim();
    if (!serial || !deviceId) {
      this.setState({
        modalError: 'Serial number and Device ID are required to save a device.',
      });
      return;
    }
    const name = this.deviceForm.name.trim();
    const device = {
      id: `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      serial_number: serial,
      device_id: deviceId,
      name,
    };
    const devices = [...this.devices, device];
    const clearedForm = {
      serial_number: '',
      device_id: '',
      name: '',
    };
    this.persistDevices(devices);
    this.deviceForm = clearedForm;
    this.setState({
      devices,
      selectedDeviceId: device.id,
      deviceForm: clearedForm,
      deviceFormExpanded: false,
      modalError: '',
    });
  }

  async startEnroll() {
    if (!this.activeIdentity) return;
    const device = this.devices.find((item) => item.id === this.selectedDeviceId);
    if (!device) {
      this.setState({
        modalError: 'Choose a device before starting enrollment.',
      });
      return;
    }
    try {
      this.setState({ enrollLoading: true, modalError: '' });
      const base = this.keyoBase.replace(/\/$/, '');
      const response = await fetch(`${base}/v1/identities/${this.activeIdentity.id}/start-enroll/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.orgToken}`,
          Accept: 'application/json; version=v2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_id: device.device_id }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const detail = this.findDetail(error);
        throw new Error(detail || 'Unable to start enrollment');
      }

      // Save last selected device
      this.saveLastSelectedDevice(this.selectedDeviceId);

      // Add ENROLL_BIOMETRIC event to metadata
      try {
        const identityResponse = await fetch(`${base}/v1/identities/${this.activeIdentity.id}/`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.orgToken}`,
            Accept: 'application/json; version=v2',
          },
        });
        if (identityResponse.ok) {
          const identity = await identityResponse.json();
          const currentMetadata = identity.metadata || {};
          const metadataWithEvent = this.addAccountEvent(currentMetadata, 'ENROLL_BIOMETRIC');
          await fetch(`${base}/v1/identities/${this.activeIdentity.id}/`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.orgToken}`,
              Accept: 'application/json; version=v2',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ metadata: metadataWithEvent }),
          });
        }
      } catch (err) {
        this.logError('Adding enroll event to metadata', err);
        // Don't throw - enrollment succeeded, metadata update is secondary
      }

      this.setState({
        enrollLoading: false,
        deviceSelectorOpen: false,
        modalError: '',
      });

      // Animate enrollment button on success
      if (response.ok) {
        this.animateEnrollmentButton('[data-action="panel-start-enroll"]');
      }
    } catch (err) {
      this.logError('Starting enrollment request', err);
      this.setState({
        enrollLoading: false,
        modalError: err.message || 'Unable to start enrollment',
      });
    }
  }

  animateEnrollmentButton(selector) {
    const button = this.shadowRoot.querySelector(selector);
    if (!button) return;
    
    button.classList.add('ki-enroll-pulse');
    setTimeout(() => {
      button.classList.remove('ki-enroll-pulse');
    }, 2000);
  }

  async tryRefreshToken() {
    if (this.refreshingToken) return false;
    const storage = this.getStorage();
    if (!storage) return false;
    const expiryRaw = storage.getItem(this.tokenExpiryKey);
    if (!expiryRaw) {
      return false;
    }
    const expiry = Number(expiryRaw);
    if (!Number.isFinite(expiry) || Date.now() > expiry) {
      storage.removeItem(this.storageKey);
      storage.removeItem(this.tokenExpiryKey);
      return false;
    }
    try {
      this.refreshingToken = true;
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Unable to refresh token');
      }

      const data = await response.json();
      if (!data?.access_token) {
        throw new Error('Token response missing access_token');
      }

      this.orgToken = data.access_token;
      if (storage) {
        storage.setItem(this.storageKey, this.orgToken);
        const newExpiry = Date.now() + (data.expires_in ? data.expires_in * 1000 : 1000 * 60 * 60 * 24 * 7);
        storage.setItem(this.tokenExpiryKey, String(newExpiry));
      }
      return true;
    } catch (err) {
      this.logError('Refreshing token', err);
      return false;
    } finally {
      this.refreshingToken = false;
    }
  }

  loadDevices() {
    const storage = this.getStorage();
    if (!storage) {
      this.devices = [];
      this.selectedDeviceId = '';
      return;
    }
    try {
      const raw = storage.getItem(this.deviceStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      this.devices = Array.isArray(parsed) ? parsed : [];
      // Auto-select device (last selected or first)
      this.selectedDeviceId = this.getAutoSelectedDeviceId() || '';
    } catch (err) {
      this.logError('Loading devices', err);
      this.devices = [];
      this.selectedDeviceId = '';
    }
  }

  persistDevices(devices) {
    const storage = this.getStorage();
    if (!storage) return;
    this.devices = devices;
    try {
      storage.setItem(this.deviceStorageKey, JSON.stringify(devices));
    } catch (err) {
      this.logError('Persisting devices', err);
    }
  }

  formatDeviceLabel(device) {
    if (!device) return '';
    const serial = device.serial_number || device.device_id || 'Device';
    const name = device.name ? ` (${device.name})` : '';
    return `${serial}${name}`;
  }

  renderDeviceDisplay() {
    const selectedDevice = this.getSelectedDevice();
    const deviceLabel = selectedDevice ? this.formatDeviceLabel(selectedDevice) : 'No device selected';
    
    return `
      <div class="ki-device-display">
        <span class="ki-device-label"><b>Enrollment Device:</b> ${this.escapeHtml(deviceLabel)}</span>
        <svg class="ki-gear-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18" fill="currentColor" data-action="open-device-admin" title="Manage devices">
          <path d="M195.1 9.5C198.1-5.3 211.2-16 226.4-16l59.8 0c15.2 0 28.3 10.7 31.3 25.5L332 79.5c14.1 6 27.3 13.7 39.3 22.8l67.8-22.5c14.4-4.8 30.2 1.2 37.8 14.4l29.9 51.8c7.6 13.2 4.9 29.8-6.5 39.9L447 233.3c.9 7.4 1.3 15 1.3 22.7s-.5 15.3-1.3 22.7l53.4 47.5c11.4 10.1 14 26.8 6.5 39.9l-29.9 51.8c-7.6 13.1-23.4 19.2-37.8 14.4l-67.8-22.5c-12.1 9.1-25.3 16.7-39.3 22.8l-14.4 69.9c-3.1 14.9-16.2 25.5-31.3 25.5l-59.8 0c-15.2 0-28.3-10.7-31.3-25.5l-14.4-69.9c-14.1-6-27.2-13.7-39.3-22.8L73.5 432.3c-14.4 4.8-30.2-1.2-37.8-14.4L5.8 366.1c-7.6-13.2-4.9-29.8 6.5-39.9l53.4-47.5c-.9-7.4-1.3-15-1.3-22.7s.5-15.3 1.3-22.7L12.3 185.8c-11.4-10.1-14-26.8-6.5-39.9L35.7 94.1c7.6-13.2 23.4-19.2 37.8-14.4l67.8 22.5c12.1-9.1 25.3-16.7 39.3-22.8L195.1 9.5zM256.3 336a80 80 0 1 0 -.6-160 80 80 0 1 0 .6 160z"/>
        </svg>
      </div>
    `;
  }

  getAutoSelectedDeviceId() {
    const storage = this.getStorage();
    if (!storage) return null;
    
    // First check for default device
    const defaultDeviceId = storage.getItem(this.defaultDeviceKey);
    if (defaultDeviceId) {
      const device = this.devices.find(d => d.id === defaultDeviceId);
      if (device) return defaultDeviceId;
    }
    
    // Then check for last selected device
    const lastDeviceId = storage.getItem(this.lastDeviceKey);
    if (lastDeviceId) {
      const device = this.devices.find(d => d.id === lastDeviceId);
      if (device) return lastDeviceId;
    }
    
    // Fallback to first device
    if (this.devices.length > 0) {
      return this.devices[0].id;
    }
    
    return null;
  }

  setDefaultDevice(deviceId) {
    const storage = this.getStorage();
    if (storage && deviceId) {
      storage.setItem(this.defaultDeviceKey, deviceId);
      // Also update last selected device
      this.saveLastSelectedDevice(deviceId);
      // Re-render to update the star icons
      this.render();
    }
  }

  getSelectedDevice() {
    const deviceId = this.getAutoSelectedDeviceId();
    if (!deviceId) return null;
    return this.devices.find(d => d.id === deviceId) || null;
  }

  saveLastSelectedDevice(deviceId) {
    const storage = this.getStorage();
    if (storage && deviceId) {
      storage.setItem(this.lastDeviceKey, deviceId);
    }
  }

  confirmDeleteBiometric() {
    if (!this.activeIdentity) return;
    const confirmFn = this.globalScope?.confirm;
    if (confirmFn) {
      const confirmed = confirmFn(
        'Are you sure? This will delete the biometric data, but not the entire account.',
      );
      if (!confirmed) return;
    } else {
      return;
    }
    this.deleteBiometric();
  }

  confirmDeleteAccount() {
    if (!this.activeIdentity) return;
    const confirmFn = this.globalScope?.confirm;
    if (confirmFn) {
      const confirmed = confirmFn(
        'Are you sure? This will delete the entire account and biometric data.',
      );
      if (!confirmed) return;
    } else {
      return;
    }
    this.deleteAccount();
  }

  confirmEnroll() {
    if (!this.activeIdentity) return;
    const device = this.getSelectedDevice();
    if (!device) {
      this.setState({ error: 'No device selected. Please select a device first.' });
      return;
    }
    const deviceLabel = this.formatDeviceLabel(device);
    const confirmFn = this.globalScope?.confirm;
    if (confirmFn) {
      const confirmed = confirmFn(
        `Start biometric enrollment on this device: ${deviceLabel}`,
      );
      if (!confirmed) return;
      this.enrollIdentity(this.activeIdentity);
    } else {
      return;
    }
  }

  async deleteBiometric() {
    try {
      this.setState({ modalSaving: true, modalError: '' });
      const base = this.keyoBase.replace(/\/$/, '');
      const response = await fetch(
        `${base}/v1/identities/${this.activeIdentity.id}/delete-biometric/`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.orgToken}`,
            Accept: 'application/json; version=v2',
            'Content-Type': 'application/json',
          },
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const detail = this.findDetail(error);
        throw new Error(detail || 'Unable to delete biometric data');
      }

      // Add DELETE_BIOMETRIC event to metadata
      try {
        const identityResponse = await fetch(`${base}/v1/identities/${this.activeIdentity.id}/`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.orgToken}`,
            Accept: 'application/json; version=v2',
          },
        });
        if (identityResponse.ok) {
          const identity = await identityResponse.json();
          const currentMetadata = identity.metadata || {};
          const metadataWithEvent = this.addAccountEvent(currentMetadata, 'DELETE_BIOMETRIC');
          await fetch(`${base}/v1/identities/${this.activeIdentity.id}/`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.orgToken}`,
              Accept: 'application/json; version=v2',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ metadata: metadataWithEvent }),
          });
        }
      } catch (err) {
        this.logError('Adding delete biometric event to metadata', err);
        // Don't throw - deletion succeeded, metadata update is secondary
      }

      this.setState({ modalSaving: false, modalError: '' });
      this.fetchIdentities();
    } catch (err) {
      this.setState({
        modalSaving: false,
        modalError: err.message || 'Unable to delete biometric data',
      });
    }
  }

  async deleteAccount() {
    try {
      this.setState({ modalSaving: true, modalError: '' });
      const base = this.keyoBase.replace(/\/$/, '');
      const response = await fetch(`${base}/v1/identities/${this.activeIdentity.id}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.orgToken}`,
          Accept: 'application/json; version=v2',
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const detail = this.findDetail(error);
        throw new Error(detail || 'Unable to delete account');
      }
      this.setState({
        modalSaving: false,
        modalError: '',
        modalOpen: false,
        activeIdentity: null,
      });
      this.fetchIdentities();
    } catch (err) {
      this.setState({
        modalSaving: false,
        modalError: err.message || 'Unable to delete account',
      });
    }
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  escapeAttribute(value) {
    return String(value || '').replaceAll('"', '&quot;');
  }

  findDetail(payload) {
    if (!payload) return '';
    
    // First, check if payload itself has a detail field at the top level
    if (Object.hasOwn?.(payload, 'detail')) {
      const detail = payload.detail;
      if (Array.isArray(detail) && detail.length > 0) {
        // If detail is an array, return the first element
        return String(detail[0]);
      }
      if (typeof detail === 'string' && detail.trim()) {
        return detail.trim();
      }
    }
    
    // Recursively search for detail fields
    for (const detail of this.detailIterator(payload)) {
      if (detail) {
        // If we find an array, return the first element
        if (Array.isArray(detail) && detail.length > 0) {
          return String(detail[0]);
        }
        // If it's a string, return it
        if (typeof detail === 'string') {
          return detail.trim();
        }
      }
    }
    return '';
  }

  pruneExpiredToken() {
    const storage = this.getStorage();
    if (!storage) return;
    const expiryRaw = storage.getItem(this.tokenExpiryKey);
    if (!expiryRaw) return;
    const expiry = Number(expiryRaw);
    if (!Number.isFinite(expiry)) return;
    if (Date.now() > expiry) {
      storage.removeItem(this.storageKey);
      storage.removeItem(this.tokenExpiryKey);
    }
  }

  getStorage() {
    return this.globalScope?.localStorage ?? null;
  }

  loadDemoMode() {
    const storage = this.getStorage();
    if (!storage) return false;
    const demoMode = storage.getItem('keyoIdentitiesDemoMode');
    return demoMode === 'true';
  }

  saveDemoMode(enabled) {
    const storage = this.getStorage();
    if (!storage) return;
    storage.setItem('keyoIdentitiesDemoMode', String(enabled));
  }

  toggleDemoMode() {
    this.demoMode = !this.demoMode;
    this.saveDemoMode(this.demoMode);
    this.setState({ demoMode: this.demoMode });
    // Update button states after demo mode change
    if (this.currentView === 'create') {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => this.updateCreateButtonStates(), 0);
    }
  }

  logError(context, err) {
    const consoleRef = this.globalScope?.console;
    if (consoleRef?.warn) {
      consoleRef.warn(`[KeyoIdentities] ${context}`, err);
    }
  }

  addAccountEvent(metadata, eventType) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const event = {
      event: eventType,
      date: dateStr,
    };
    const updatedMetadata = { ...metadata };
    
    // Parse account_events from string if it exists, otherwise start with empty array
    let eventsArray = [];
    if (updatedMetadata.account_events) {
      if (typeof updatedMetadata.account_events === 'string') {
        try {
          eventsArray = JSON.parse(updatedMetadata.account_events);
          if (!Array.isArray(eventsArray)) {
            eventsArray = [];
          }
        } catch (err) {
          this.logError('Parsing account_events string', err);
          eventsArray = [];
        }
      } else if (Array.isArray(updatedMetadata.account_events)) {
        // Handle backward compatibility: if it's already an array, use it
        eventsArray = [...updatedMetadata.account_events];
      }
    }
    
    // Add the new event
    eventsArray.push(event);
    
    // Store as JSON string
    updatedMetadata.account_events = JSON.stringify(eventsArray);
    
    return updatedMetadata;
  }

  *detailIterator(node) {
    if (node === null || node === undefined) {
      return;
    }
    if (typeof node === 'string') {
      const trimmed = node.trim();
      if (trimmed) {
        yield trimmed;
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        yield* this.detailIterator(item);
      }
      return;
    }
    if (typeof node === 'object') {
      if (Object.hasOwn?.(node, 'detail')) {
        yield* this.detailIterator(node.detail);
      }
      for (const value of Object.values(node)) {
        yield* this.detailIterator(value);
      }
    }
  }
}

customElements.define('keyo-identities-module', KeyoIdentitiesModule);


