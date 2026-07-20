(function () {
  "use strict";

  var DICT = {
    notwithstanding: {
      pos: "prep.",
      meaning: "尽管；虽然（正式书面）",
      collocation: "notwithstanding the fact that …",
    },
    constituted: { pos: "v.", meaning: "构成；算作" },
    defendant: { pos: "n.", meaning: "被告" },
    contract: { pos: "n.", meaning: "合同" },
    breach: { pos: "n.", meaning: "违约；违背" },
    warnings: { pos: "n.", meaning: "警告" },
    prior: { pos: "adj.", meaning: "先前的；事先的" },
    actions: { pos: "n.", meaning: "行为；行动" },
    ruled: { pos: "v.", meaning: "裁定；统治" },
    court: { pos: "n.", meaning: "法院；法庭" },
    investor: { pos: "n.", meaning: "投资者" },
    volatile: { pos: "adj.", meaning: "波动剧烈的；不稳定的" },
    impulsive: { pos: "adj.", meaning: "冲动的" },
    patience: { pos: "n.", meaning: "耐心" },
    essential: { pos: "adj.", meaning: "至关重要的" },
  };

  var MOCK_LEARNING = {
    court: {
      translation: "法院裁定，被告的行为尽管事先已有警告，仍构成违约。",
      vocabulary: [
        {
          text: "notwithstanding",
          kind: "短语",
          occurrence_count: 1,
          translation: "尽管；虽然（正式书面）",
          note: "插入语，表让步，常见于法律 / 学术文本",
        },
        {
          text: "constituted",
          kind: "动词",
          occurrence_count: 1,
          translation: "构成；算作",
        },
        {
          text: "breach of contract",
          kind: "短语",
          occurrence_count: 1,
          translation: "违约",
        },
        {
          text: "defendant",
          kind: "名词",
          occurrence_count: 1,
          translation: "被告",
        },
      ],
      grammar: {
        main_clause: "The court ruled that … constituted a breach of contract",
        subject: "The court",
        predicate: "ruled",
        object: "",
        clauses: [
          "that the defendant's actions … constituted a breach（宾语从句）",
        ],
        modifiers: ["notwithstanding prior warnings（插入语，表让步）"],
        details: [
          "notwithstanding 作介词，置于名词短语前，语气正式",
          "that 引导宾语从句，说明 court ruled 的内容",
        ],
      },
      why_written:
        "法律英语常用 notwithstanding 表达「尽管已有 X，仍发生 Y」，比 although 更书面、紧凑；插入语结构使让步信息不打断主句逻辑。",
      similar_sentences: [
        {
          english:
            "Notwithstanding the rain, the match continued as scheduled.",
          translation: "尽管下雨，比赛仍按原计划进行。",
        },
        {
          english:
            "The plan went ahead, notwithstanding objections from several members.",
          translation: "尽管几名成员反对，该计划仍继续推进。",
        },
      ],
    },
    investor: {
      translation:
        "尽管许多投资者明白耐心至关重要，但当市场变得波动剧烈时，他们往往会做出冲动决策，而这可能严重损害其长期回报。",
      vocabulary: [
        {
          text: "investor",
          kind: "n.",
          occurrence_count: 12,
          translation: "投资者",
          note: "可数名词，financial context 高频",
        },
        {
          text: "volatile",
          kind: "adj.",
          occurrence_count: 5,
          translation: "波动剧烈的；不稳定的",
        },
        {
          text: "impulsive decisions",
          kind: "搭配",
          occurrence_count: 3,
          translation: "冲动决策",
        },
        {
          text: "patience is essential",
          kind: "短语",
          occurrence_count: 1,
          translation: "耐心至关重要",
        },
      ],
      grammar: {
        main_clause: "they often make impulsive decisions",
        subject: "they（指代 investors）",
        predicate: "often make",
        object: "impulsive decisions",
        clauses: [
          "Although many investors understand that patience is essential（让步状语从句）",
          "when the market becomes volatile（时间状语从句）",
          "which can seriously damage their long-term returns（非限制性定语从句）",
        ],
        modifiers: [
          "Although…essential 置于句首，表示让步",
          "when…volatile 说明冲动决策发生的条件",
        ],
        details: [
          "时态：一般现在时，描述普遍现象",
          "understand 后接 that 引导的宾语从句",
        ],
      },
      why_written:
        "典型「让步—行为—后果」论述结构：先承认理性共识，再指出实际偏差，最后用 which 从句点明代价。",
      similar_sentences: [
        {
          english:
            "Although students know that consistent practice matters, they often procrastinate when exams seem distant, which can weaken their final performance.",
          translation:
            "尽管学生知道坚持练习很重要，但当考试显得还很遥远时，他们往往会拖延，这可能削弱最终表现。",
        },
        {
          english:
            "Although managers recognize that planning is crucial, they frequently cut corners when deadlines pressure them, which can undermine project quality.",
          translation:
            "尽管管理者认识到规划至关重要，但在截止日期压力下他们经常走捷径，这可能损害项目质量。",
        },
      ],
    },
  };

  var state = {
    selection: "",
    sentence: "",
    autoTranslate: true,
    popoverOpen: false,
    lastRequestKey: "",
    grammarReady: false,
    vocabulary: [],
    savedKeys: new Set(),
    markedLemmas: new Set(),
    expandedBankLemma: "",
    stats: { new: 3, marked: 42 },
  };

  var debounceTimer = null;
  var toastTimer = null;
  var translateTimer = null;
  var lastRect = null;

  var mockScene = document.getElementById("mockScene");
  var mockArticle = document.getElementById("mockArticle");
  var mockPopoverLayer = document.getElementById("mockPopoverLayer");
  var popoverWord = document.getElementById("popoverWord");
  var popoverBody = document.getElementById("popoverBody");
  var btnLearn = document.getElementById("btnLearn");
  var btnSave = document.getElementById("btnSave");
  var btnClose = document.getElementById("btnClose");
  var mockToastWrap = document.getElementById("mockToastWrap");
  var mockToast = document.getElementById("mockToast");
  var mockToastText = document.getElementById("mockToastText");
  var grammarEmpty = document.getElementById("grammarEmpty");
  var grammarContent = document.getElementById("grammarContent");
  var grammarQuote = document.getElementById("grammarQuote");
  var grammarLearning = document.getElementById("grammarLearning");
  var bankEmpty = document.getElementById("bankEmpty");
  var bankHeader = document.getElementById("bankHeader");
  var bankList = document.getElementById("bankList");
  var toggleAuto = document.getElementById("toggleAuto");
  var designWorkspace = document.querySelector(".design-workspace");
  var designSidepanel = document.getElementById("designSidepanel");
  var btnClosePanel = document.getElementById("btnClosePanel");
  var btnReopenPanel = document.getElementById("btnReopenPanel");
  var designMain = document.querySelector(".design-main");

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeWord(text) {
    return text.trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
  }

  function vocabLemma(text) {
    return text.trim().toLowerCase();
  }

  function lookupEntry(text) {
    var word = normalizeWord(text);
    if (word && DICT[word]) {
      return { word: text.trim(), pos: DICT[word].pos, meaning: DICT[word].meaning };
    }
    var isSentence = text.trim().indexOf(" ") !== -1 || text.length > 24;
    return {
      word: text.trim(),
      pos: isSentence ? "sentence" : "word",
      meaning: isSentence
        ? "（演示）整句释义：" + getMockLearning(text, text).translation
        : "（演示）暂无词典条目，可 ★ 留标",
    };
  }

  function getMockLearning(sentence, selection) {
    var text = (sentence || selection || "").toLowerCase();
    if (text.indexOf("court") !== -1 || text.indexOf("notwithstanding") !== -1) {
      return MOCK_LEARNING.court;
    }
    if (
      text.indexOf("investor") !== -1 ||
      text.indexOf("volatile") !== -1 ||
      text.indexOf("impulsive") !== -1
    ) {
      return MOCK_LEARNING.investor;
    }
    return MOCK_LEARNING.court;
  }

  function extractSentence(text, articleEl) {
    var full = articleEl.innerText.replace(/\s+/g, " ");
    var idx = full.toLowerCase().indexOf(text.toLowerCase());
    if (idx === -1) return text;
    var start = idx;
    var end = idx + text.length;
    while (start > 0 && !/[.!?]/.test(full[start - 1])) start--;
    if (start > 0 && /[.!?]/.test(full[start - 1])) start++;
    while (start < full.length && full[start] === " ") start++;
    while (end < full.length && !/[.!?]/.test(full[end])) end++;
    if (end < full.length) end++;
    return full.slice(start, end).trim();
  }

  function isFullSentenceSelection(selection, sentence) {
    var sel = selection.trim();
    if (!sel || sel.indexOf(" ") === -1) return false;

    var sent = sentence.trim();
    var selNorm = sel.replace(/\s+/g, " ").trim().toLowerCase();
    var sentNorm = sent.replace(/\s+/g, " ").trim().toLowerCase();

    if (/[.!?]["')\]]*\s*$/.test(sel)) return true;
    if (selNorm === sentNorm) return true;
    if (sentNorm.indexOf(selNorm) === 0 && sentNorm.length - selNorm.length <= 2) {
      return true;
    }
    return false;
  }

  function openSentenceLearning(text, sentence) {
    hidePopover();
    state.selection = text;
    state.sentence = sentence;
    state.grammarReady = true;
    reopenSidePanel();
    renderGrammarPanel();
    switchSidePanel("grammar");
  }

  function highlightSelectionInQuote(sentence, selection) {
    if (!selection) return escapeHtml(sentence);
    var idx = sentence.toLowerCase().indexOf(selection.toLowerCase());
    if (idx === -1) return escapeHtml(sentence);
    return (
      escapeHtml(sentence.slice(0, idx)) +
      "<strong>" +
      escapeHtml(sentence.slice(idx, idx + selection.length)) +
      "</strong>" +
      escapeHtml(sentence.slice(idx + selection.length))
    );
  }

  function renderLearningHtml(learning) {
    var g = learning.grammar;
    var rows = [];
    if (g.main_clause) rows.push(["主句", g.main_clause]);
    if (g.subject) rows.push(["主语", g.subject]);
    if (g.predicate) rows.push(["谓语", g.predicate]);
    if (g.object) rows.push(["宾语/表语", g.object]);
    (g.clauses || []).forEach(function (c, i) {
      rows.push([i === 0 ? "从句" : "", c]);
    });
    (g.modifiers || []).forEach(function (m, i) {
      rows.push([i === 0 ? "修饰成分" : "", m]);
    });

    var grammarHtml = rows
      .map(function (pair) {
        return (
          '<div class="km-grammar-row"><span class="km-grammar-label">' +
          escapeHtml(pair[0]) +
          '</span><span class="km-grammar-value">' +
          escapeHtml(pair[1]) +
          "</span></div>"
        );
      })
      .join("");

    var detailsHtml = (g.details || [])
      .map(function (d) {
        return "<li>" + escapeHtml(d) + "</li>";
      })
      .join("");

    var similarHtml = learning.similar_sentences
      .map(function (s, i) {
        return (
          '<div class="km-similar-card"><div class="km-similar-index">例句 ' +
          (i + 1) +
          '</div><p class="km-similar-en">' +
          escapeHtml(s.english) +
          '</p><p class="km-similar-zh">' +
          escapeHtml(s.translation) +
          "</p></div>"
        );
      })
      .join("");

    return (
      '<div class="km-block-title">翻译</div><p class="km-translation-box">' +
      escapeHtml(learning.translation) +
      '</p><div class="km-block-title">语法结构</div><div class="km-grammar-table">' +
      grammarHtml +
      "</div>" +
      (detailsHtml
        ? '<ul class="km-bullet-list">' + detailsHtml + "</ul>"
        : "") +
      '<div class="km-block-title">为什么这样写</div><div class="km-why-box">' +
      escapeHtml(learning.why_written) +
      '</div><div class="km-block-title">仿写例句</div><div class="km-similar-list">' +
      similarHtml +
      "</div>"
    );
  }

  function getSelectionRect() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    return sel.getRangeAt(0).getBoundingClientRect();
  }

  function positionPopover() {
    if (!mockScene || !mockPopoverLayer || !lastRect) return;

    var gap = 8;
    var popWidth = 300;
    var popHeight = mockPopoverLayer.offsetHeight || 120;
    var sceneRect = mockScene.getBoundingClientRect();

    var top = lastRect.bottom - sceneRect.top + gap;
    if (lastRect.bottom + popHeight + gap > sceneRect.bottom) {
      top = Math.max(gap, lastRect.top - sceneRect.top - gap - popHeight);
    }

    var left =
      lastRect.left - sceneRect.left + lastRect.width / 2 - popWidth / 2;
    var maxLeft = mockScene.clientWidth - popWidth - 12;
    left = Math.max(12, Math.min(left, maxLeft));

    mockPopoverLayer.style.width = popWidth + "px";
    mockPopoverLayer.style.left = left + "px";
    mockPopoverLayer.style.top = top + "px";
  }

  function showPopoverLayer() {
    mockPopoverLayer.classList.remove("km-hidden");
    positionPopover();
  }

  function hidePopover() {
    state.popoverOpen = false;
    clearTimeout(translateTimer);
    mockPopoverLayer.classList.add("km-hidden");
  }

  function readSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) return null;
    var text = sel.toString().trim();
    if (!text || text.length > 500) return null;
    var anchor = sel.anchorNode;
    if (!anchor || !mockArticle.contains(anchor)) return null;
    if (!/[a-zA-Z]/.test(text)) return null;
    return text;
  }

  function renderLoading() {
    popoverBody.innerHTML =
      '<div class="km-skeleton"><div class="km-skeleton-line w80"></div><div class="km-skeleton-line w60"></div></div>';
  }

  function renderPopoverContent(entry) {
    var title =
      entry.word.length > 28 ? entry.word.slice(0, 28) + "…" : entry.word;
    popoverWord.textContent = title;
    popoverBody.innerHTML =
      '<p class="km-meaning"><span class="km-pos-tag">' +
      escapeHtml(entry.pos) +
      "</span>" +
      escapeHtml(entry.meaning) +
      "</p>";
  }

  function getSaveKey() {
    if (!state.selection) return "";
    return vocabLemma(state.selection) + "::" + state.sentence.slice(0, 80);
  }

  function updateSaveButtonState() {
    var saved = state.savedKeys.has(getSaveKey());
    btnSave.textContent = saved ? "★" : "☆";
    btnSave.classList.toggle("saved", saved);
    btnSave.title = saved ? "已留标" : "留标";
  }

  function updateStats() {
    if (toggleAuto) toggleAuto.classList.toggle("on", state.autoTranslate);
  }

  function showToast(message, type) {
    clearTimeout(toastTimer);
    mockToastText.textContent = message;
    mockToast.classList.toggle("warning", type === "warning");
    mockToastWrap.classList.remove("km-hidden");
    toastTimer = setTimeout(function () {
      mockToastWrap.classList.add("km-hidden");
    }, 2200);
  }

  function renderGrammarPanel() {
    if (!state.grammarReady || !state.sentence) {
      grammarEmpty.classList.remove("km-hidden");
      grammarContent.classList.add("km-hidden");
      return;
    }

    var learning = getMockLearning(state.sentence, state.selection);
    state.vocabulary = learning.vocabulary || [];
    grammarEmpty.classList.add("km-hidden");
    grammarContent.classList.remove("km-hidden");
    grammarQuote.innerHTML = highlightSelectionInQuote(
      state.sentence,
      state.selection
    );
    grammarLearning.innerHTML = renderLearningHtml(learning);
    renderBankPanel();
  }

  function isLemmaMarked(lemma) {
    return state.markedLemmas.has(lemma);
  }

  function renderBankPanel() {
    if (!state.vocabulary.length) {
      bankEmpty.classList.remove("km-hidden");
      bankHeader.classList.add("km-hidden");
      bankList.innerHTML = "";
      return;
    }

    bankEmpty.classList.add("km-hidden");
    bankHeader.classList.remove("km-hidden");
    bankHeader.textContent =
      "句内词汇 · " +
      state.vocabulary.length +
      " 项 · 点击行展开详情，☆ 留标";

    bankList.innerHTML = state.vocabulary
      .map(function (item) {
        var lemma = vocabLemma(item.text);
        var marked = isLemmaMarked(lemma);
        var expanded = state.expandedBankLemma === lemma;
        var note = item.note
          ? '<p class="km-word-row-detail-meta">' + escapeHtml(item.note) + "</p>"
          : "";
        return (
          '<div class="km-word-row' +
          (expanded ? " expanded" : "") +
          (marked ? " marked" : "") +
          '" data-lemma="' +
          escapeHtml(lemma) +
          '"><div class="km-word-row-main"><span class="km-word-row-chevron" aria-hidden="true">›</span><span class="km-word-row-lemma">' +
          escapeHtml(item.text) +
          '</span><span class="km-word-row-pos">' +
          escapeHtml(item.kind || "单词") +
          '</span><span class="km-word-row-count">' +
          (item.occurrence_count || 1) +
          ' 次</span><button type="button" class="km-btn km-btn-outline km-btn-save-star km-word-row-star' +
          (marked ? " saved" : "") +
          '" data-star="' +
          escapeHtml(lemma) +
          '" title="' +
          (marked ? "已留标" : "留标") +
          '">' +
          (marked ? "★" : "☆") +
          '</button></div><div class="km-word-row-detail"><div class="km-word-row-detail-label">释义</div><p class="km-word-row-detail-text">' +
          escapeHtml(item.translation) +
          "</p>" +
          note +
          "</div></div>"
        );
      })
      .join("");

    bankList.querySelectorAll(".km-word-row").forEach(function (row) {
      row.querySelector(".km-word-row-main").addEventListener("click", function (e) {
        if (e.target.closest(".km-word-row-star")) return;
        var lemma = row.getAttribute("data-lemma");
        state.expandedBankLemma =
          state.expandedBankLemma === lemma ? "" : lemma;
        renderBankPanel();
      });
    });

    bankList.querySelectorAll(".km-word-row-star").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleLemmaMark(btn.getAttribute("data-star"));
      });
    });
  }

  function toggleLemmaMark(lemma) {
    if (!lemma) return;
    if (state.markedLemmas.has(lemma)) {
      state.markedLemmas.delete(lemma);
      showToast("已取消留标 " + lemma);
    } else {
      state.markedLemmas.add(lemma);
      state.stats.marked += 1;
      showToast("已留标 " + lemma);
      updateStats();
    }
    renderBankPanel();
    if (vocabLemma(state.selection) === lemma) {
      updateSaveButtonState();
    }
  }

  function reopenSidePanel() {
    if (designWorkspace) {
      designWorkspace.classList.remove("design-sidepanel-collapsed");
    }
  }

  function loadGrammar() {
    if (!state.selection) {
      showToast("请先选中英文单词或句子", "warning");
      return;
    }
    state.grammarReady = true;
    renderGrammarPanel();
    switchSidePanel("grammar");
  }

  function toggleSave() {
    if (!state.selection) {
      showToast("请先选中英文单词或句子", "warning");
      return;
    }
    var key = getSaveKey();
    if (state.savedKeys.has(key)) {
      state.savedKeys.delete(key);
      showToast("已取消留标 " + state.selection);
    } else {
      state.savedKeys.add(key);
      state.stats.new += 1;
      state.stats.marked += 1;
      state.markedLemmas.add(vocabLemma(state.selection));
      showToast("已留标 " + state.selection);
      updateStats();
    }
    updateSaveButtonState();
    if (state.grammarReady) renderBankPanel();
  }

  function fetchTranslate(force) {
    var text = readSelection();
    if (!text) return;

    if (!state.autoTranslate && !force) return;

    var sentence = extractSentence(text, mockArticle);
    var requestKey = text + "::" + sentence.slice(0, 80);

    if (!force && state.popoverOpen && state.lastRequestKey === requestKey) {
      updateSaveButtonState();
      positionPopover();
      return;
    }

    state.selection = text;
    state.sentence = sentence;
    state.lastRequestKey = requestKey;
    state.popoverOpen = true;
    lastRect = getSelectionRect();
    showPopoverLayer();
    renderLoading();
    updateSaveButtonState();

    clearTimeout(translateTimer);
    translateTimer = setTimeout(function () {
      renderPopoverContent(lookupEntry(text));
      positionPopover();
    }, 380);
  }

  function onSelectionEnd() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var text = readSelection();
      if (!text) {
        if (!state.popoverOpen) return;
        return;
      }

      var sentence = extractSentence(text, mockArticle);
      if (isFullSentenceSelection(text, sentence)) {
        openSentenceLearning(text, sentence);
        return;
      }

      if (state.autoTranslate) fetchTranslate(false);
      else {
        state.selection = text;
        state.sentence = sentence;
        lastRect = getSelectionRect();
      }
    }, 300);
  }

  function switchSidePanel(tabName) {
    reopenSidePanel();
    document.querySelectorAll("#sidePanel .km-tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    document.getElementById("panelGrammar").classList.toggle(
      "active",
      tabName === "grammar"
    );
    document.getElementById("panelBank").classList.toggle(
      "active",
      tabName === "bank"
    );
    document.querySelectorAll('.design-nav a[data-nav="sidepanel"]').forEach(
      function (link) {
        link.classList.toggle("active", link.dataset.tab === tabName);
      }
    );
    document.querySelectorAll('.design-nav a[data-nav="scroll"]').forEach(
      function (link) {
        link.classList.remove("active");
      }
    );
  }

  function initNav() {
    var scrollLinks = document.querySelectorAll('.design-nav a[data-nav="scroll"]');
    var sidepanelLinks = document.querySelectorAll(
      '.design-nav a[data-nav="sidepanel"]'
    );
    var scrollSections = Array.from(scrollLinks).map(function (link) {
      return document.getElementById(link.getAttribute("href").slice(1));
    });

    function setScrollActive() {
      var current = scrollSections[0];
      scrollSections.forEach(function (section) {
        if (section && section.getBoundingClientRect().top <= 120) {
          current = section;
        }
      });
      scrollLinks.forEach(function (link) {
        link.classList.toggle(
          "active",
          current && link.getAttribute("href") === "#" + current.id
        );
      });
      if (current) {
        sidepanelLinks.forEach(function (link) {
          link.classList.remove("active");
        });
      }
    }

    document.querySelectorAll("#sidePanel .km-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchSidePanel(btn.dataset.tab);
      });
    });

    sidepanelLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        switchSidePanel(link.dataset.tab);
      });
    });

    scrollLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        var id = link.getAttribute("href").slice(1);
        var section = document.getElementById(id);
        if (section && designMain) {
          event.preventDefault();
          var top =
            section.getBoundingClientRect().top -
            designMain.getBoundingClientRect().top +
            designMain.scrollTop -
            16;
          designMain.scrollTo({ top: top, behavior: "smooth" });
        }
      });
    });

    setScrollActive();
    window.addEventListener("scroll", setScrollActive, { passive: true });
    if (designMain) {
      designMain.addEventListener("scroll", setScrollActive, { passive: true });
      designMain.addEventListener("scroll", positionPopover, { passive: true });
    }
  }

  function initInteractions() {
    if (!mockArticle) return;

    mockArticle.addEventListener("mouseup", onSelectionEnd);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hidePopover();
    });

    if (btnLearn) btnLearn.addEventListener("click", loadGrammar);
    if (btnSave) btnSave.addEventListener("click", toggleSave);
    if (btnClose) btnClose.addEventListener("click", hidePopover);

    if (toggleAuto) {
      toggleAuto.addEventListener("click", function () {
        state.autoTranslate = !state.autoTranslate;
        updateStats();
        showToast(
          state.autoTranslate ? "已开启选中即翻译" : "已关闭选中即翻译"
        );
      });
    }

    if (btnClosePanel && designWorkspace) {
      btnClosePanel.addEventListener("click", function () {
        designWorkspace.classList.add("design-sidepanel-collapsed");
      });
    }

    if (btnReopenPanel && designWorkspace) {
      btnReopenPanel.addEventListener("click", function () {
        designWorkspace.classList.remove("design-sidepanel-collapsed");
        if (designSidepanel) {
          designSidepanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    }

    document
      .querySelectorAll("[data-demo-toast]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          showToast(btn.getAttribute("data-demo-toast"), btn.dataset.type || "");
        });
      });

    window.addEventListener("resize", positionPopover);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(positionPopover);
    }

    renderGrammarPanel();
    renderBankPanel();
    updateStats();
  }

  initNav();
  initInteractions();
})();
