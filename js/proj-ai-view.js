// ============================================================
// AP3X VER5E — PROJECT AI VIEW v1.0
// Learn from text · Ask questions · Anticipate follow-ups
// ============================================================

const ProjAIView = (() => {

  let currentProjectId = null;

  function init() {
    _renderKnowledgeList();
    _renderConversation();
    _populateProjectFilter();
    // Auto-learn from all projects on first init
    if (typeof ProjectAI !== 'undefined') {
      ProjectAI.autoLearnFromProjects();
    }
  }

  function _populateProjectFilter() {
    var sel = document.getElementById('pai-project-filter');
    if (!sel) return;
    var projects = ProjectEngine.getAllProjects();
    sel.innerHTML = '<option value="">All Projects</option>' +
      projects.map(function(p) { return '<option value="' + p.id + '">' + p.name + '</option>'; }).join('');
    sel.onchange = function() { currentProjectId = sel.value || null; };
  }

  // ── LEARN panel ──────────────────────────────────────────
  function submitLearn() {
    var titleEl = document.getElementById('pai-learn-title');
    var textEl  = document.getElementById('pai-learn-text');
    var projSel = document.getElementById('pai-learn-project');
    var outEl   = document.getElementById('pai-learn-output');

    var title   = titleEl ? titleEl.value.trim() : '';
    var text    = textEl  ? textEl.value.trim()  : '';
    var projId  = projSel ? projSel.value || null : null;

    if (!text || text.length < 10) {
      if (outEl) outEl.innerHTML = '<div class="pai-error">[ ERROR ] Please paste at least a few sentences of text.</div>';
      return;
    }

    if (outEl) outEl.innerHTML = '<div class="pai-processing">[ LEARNING… ]</div>';

    setTimeout(function() {
      var result = ProjectAI.learnFromText(title || 'Uploaded Knowledge', text, projId);
      if (!result.success) {
        if (outEl) outEl.innerHTML = '<div class="pai-error">[ ERROR ] ' + (result.error || 'Unknown error') + '</div>';
        return;
      }
      if (outEl) {
        outEl.innerHTML = '<div class="pai-learn-success">' +
          '<div class="pai-ls-header">✓ KNOWLEDGE INDEXED</div>' +
          '<div class="pai-ls-stat">Facts extracted: ' + result.factCount + '</div>' +
          '<div class="pai-ls-stat">Entities found: ' + result.entityCount + '</div>' +
          '<div class="pai-ls-stat">Q&amp;A pairs generated: ' + result.qaPairsGenerated + '</div>' +
          '<div class="pai-ls-stat">Topics: ' + (result.knowledge.topics || []).join(', ') + '</div>' +
          '</div>';
      }
      if (textEl)  textEl.value  = '';
      if (titleEl) titleEl.value = '';
      _renderKnowledgeList();
    }, 150);
  }

  // ── Knowledge list ────────────────────────────────────────
  function _renderKnowledgeList() {
    var el        = document.getElementById('pai-knowledge-list');
    var knowledge = ProjectAI.getAllKnowledge();
    if (!el) return;

    if (knowledge.length === 0) {
      el.innerHTML = '<div class="pai-empty">[ No knowledge uploaded yet ]</div>';
      return;
    }

    el.innerHTML = knowledge.slice(0, 20).map(function(k) {
      var ago = _reltime(k.learnedAt);
      return '<div class="pai-kb-item">' +
        '<div class="pai-kb-title">' + _esc(k.title) + '</div>' +
        '<div class="pai-kb-meta">' + k.wordCount + ' words · ' + k.facts.length + ' facts · ' + ago + '</div>' +
        '<div class="pai-kb-topics">' + (k.topics || []).slice(0,3).map(function(t) { return '<span class="pai-topic-tag">'+t+'</span>'; }).join('') + '</div>' +
        '<button class="pai-del-btn" onclick="ProjAIView.deleteKnowledge(\'' + k.id + '\')">✕</button>' +
        '</div>';
    }).join('');
  }

  function deleteKnowledge(id) {
    if (!confirm('Delete this knowledge entry?')) return;
    ProjectAI.deleteKnowledge(id);
    _renderKnowledgeList();
  }

  // ── ASK panel ─────────────────────────────────────────────
  function submitQuestion() {
    var inputEl = document.getElementById('pai-question-input');
    var q = inputEl ? inputEl.value.trim() : '';
    if (!q) return;
    if (inputEl) inputEl.value = '';
    _addMessage('user', q, {});
    ProjectAI.saveMessage('user', q);

    setTimeout(function() {
      var result = ProjectAI.ask(q, currentProjectId);
      _addMessage('ai', result.answer, { source: result.source, confidence: result.confidence, followUps: result.followUps });
      ProjectAI.saveMessage('ai', result.answer, { source: result.source });
    }, 80);
  }

  function askFollowUp(question) {
    var inputEl = document.getElementById('pai-question-input');
    if (inputEl) inputEl.value = question;
    submitQuestion();
  }

  function _addMessage(role, content, meta) {
    var chatEl = document.getElementById('pai-chat');
    if (!chatEl) return;

    // Remove placeholder
    var ph = chatEl.querySelector('.pai-chat-placeholder');
    if (ph) ph.remove();

    var div = document.createElement('div');
    div.className = 'pai-msg pai-msg-' + role;

    var inner = '<div class="pai-msg-bubble">' + _esc(content).replace(/\n/g, '<br>') + '</div>';

    if (role === 'ai' && meta) {
      if (meta.source) {
        inner += '<div class="pai-msg-meta">Source: ' + _esc(meta.source) + ' · Confidence: ' + Math.round((meta.confidence || 0) * 100) + '%</div>';
      }
      if (meta.followUps && meta.followUps.length) {
        inner += '<div class="pai-followups">';
        for (var i = 0; i < meta.followUps.length; i++) {
          inner += '<button class="pai-followup-btn" onclick="ProjAIView.askFollowUp(' + JSON.stringify(meta.followUps[i]) + ')">' + _esc(meta.followUps[i]) + '</button>';
        }
        inner += '</div>';
      }
    }

    div.innerHTML = inner;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function _renderConversation() {
    var chatEl  = document.getElementById('pai-chat');
    if (!chatEl) return;
    var history = ProjectAI.getConversationHistory();

    if (history.length === 0) {
      chatEl.innerHTML = '<div class="pai-chat-placeholder">[ Ask me anything about your projects — investor angles, technical details, grants, features, build structure… ]</div>';
      return;
    }

    chatEl.innerHTML = '';
    for (var i = 0; i < history.length; i++) {
      var msg = history[i];
      _addMessage(msg.role, msg.content, msg.meta || {});
    }
  }

  function clearChat() {
    if (!confirm('Clear conversation history?')) return;
    ProjectAI.clearConversation();
    var chatEl = document.getElementById('pai-chat');
    if (chatEl) chatEl.innerHTML = '<div class="pai-chat-placeholder">[ Ask me anything about your projects… ]</div>';
  }

  function handleKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitQuestion();
    }
  }

  // Helpers
  function _reltime(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000)    return 'just now';
    if (diff < 3600000)  return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  }
  function _esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, submitLearn, submitQuestion, askFollowUp, deleteKnowledge, clearChat, handleKey };
})();

window.ProjAIView = ProjAIView;
