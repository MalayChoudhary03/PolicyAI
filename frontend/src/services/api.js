const API_BASE = '/api';

export const auth = {
  getAdminKey() {
    return sessionStorage.getItem('policyai_admin_key') || '';
  },
  setAdminKey(key) {
    sessionStorage.setItem('policyai_admin_key', key.trim());
  },
  clearAdminKey() {
    sessionStorage.removeItem('policyai_admin_key');
  },
  isAdminAuthenticated() {
    return Boolean(sessionStorage.getItem('policyai_admin_key'));
  }
};

const headers = (isAdmin = false) => {
  const h = { 'Content-Type': 'application/json' };
  if (isAdmin) {
    const key = auth.getAdminKey();
    if (key) {
      h['x-admin-key'] = key;
    }
  }
  return h;
};

export const api = {
  // Authentication & Verification
  async verifyAdminKey(key) {
    const res = await fetch(`${API_BASE}/documents/verify-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': key.trim()
      }
    });
    return res.json();
  },

  // System Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Document APIs (Admin Protected)
  async getDocuments() {
    const res = await fetch(`${API_BASE}/documents`, {
      headers: headers(true)
    });
    return res.json();
  },

  async getDocumentById(id) {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      headers: headers(true)
    });
    return res.json();
  },

  async uploadDocument(formData) {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { 'x-admin-key': auth.getAdminKey() },
      body: formData
    });
    return res.json();
  },

  async togglePublish(id) {
    const res = await fetch(`${API_BASE}/documents/${id}/toggle-publish`, {
      method: 'PATCH',
      headers: headers(true)
    });
    return res.json();
  },

  async deleteDocument(id) {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      headers: headers(true)
    });
    return res.json();
  },

  // Context & CAG Cache APIs
  async getContextStatus() {
    const res = await fetch(`${API_BASE}/context/status`);
    return res.json();
  },

  async prepareContext() {
    const res = await fetch(`${API_BASE}/context/prepare`, {
      method: 'POST',
      headers: headers(true)
    });
    return res.json();
  },

  async previewContext() {
    const res = await fetch(`${API_BASE}/context/preview`, {
      headers: headers(true)
    });
    return res.json();
  },

  // Streaming Employee Chat API (Real-time Token SSE)
  async askQuestionStream(question, onChunk, onDone, onError) {
    try {
      const res = await fetch(`${API_BASE}/chat/ask-stream`, {
        method: 'POST',
        headers: headers(false),
        body: JSON.stringify({ question })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            try {
              const msg = JSON.parse(jsonStr);
              if (msg.type === 'chunk') {
                onChunk(msg.text);
              } else if (msg.type === 'done') {
                onDone(msg.data);
              } else if (msg.type === 'error') {
                onError?.(new Error(msg.error));
              }
            } catch (e) {
              // Parse error on incomplete buffer, skip
            }
          }
        }
      }
    } catch (err) {
      onError?.(err);
    }
  }
};
