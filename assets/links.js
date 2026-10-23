/* 网址集成 —— 纯前端，数据保存在 localStorage（键 ahut_links_v1） */
(function () {
  'use strict';

  var STORE_KEY = 'ahut_links_v1';
  var THEME_KEY = 'dark_mode';
  var TILE_COLORS = [
    '#4652ee', '#0a7f56', '#b45309', '#7c3aed',
    '#0e7490', '#be123c', '#4338ca', '#15803d'
  ];

  var DEFAULT_DATA = {
    version: 1,
    groups: [
      {
        id: 'g-campus', name: '校园入口', collapsed: false,
        links: [
          { id: 'u-campus', name: 'U校园', url: 'https://www.eduplus.net/', desc: '本科课程与课外学习平台' },
          { id: 'ahu-site', name: '安徽大学', url: 'https://www.ahu.edu.cn/', desc: '学校官网与通知公告' },
          { id: 'ahu-jwc', name: '教务处', url: 'https://jwc.ahu.edu.cn/', desc: '选课、成绩与教学通知' },
          { id: 'ahu-lib', name: '图书馆', url: 'https://lib.ahu.edu.cn/', desc: '馆藏检索与借阅续借' },
          { id: 'ahu-mail', name: '校园邮箱', url: 'https://mail.ahu.edu.cn/', desc: '学校邮箱登录' }
        ]
      },
      {
        id: 'g-study', name: '学习平台', collapsed: false,
        links: [
          { id: 'mooc', name: '中国大学MOOC', url: 'https://www.icourse163.org/', desc: '名校公开课与慕课' },
          { id: 'chaoxing', name: '学习通', url: 'https://passport2.chaoxing.com/', desc: '课程签到与资料' },
          { id: 'bilibili', name: '哔哩哔哩', url: 'https://www.bilibili.com/', desc: '课程录播与技术视频' },
          { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/', desc: '对话与代码助手' },
          { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn/', desc: '长文档阅读与整理' }
        ]
      },
      {
        id: 'g-major', name: '专业与竞赛', collapsed: false,
        links: [
          { id: 'ciciec', name: '集创赛', url: 'https://univ.ciciec.com/', desc: '全国大学生集成电路创新创业大赛' },
          { id: 'nuedc', name: '电赛培训网', url: 'https://www.nuedc-training.com.cn/', desc: '电子设计竞赛历年赛题与通知' },
          { id: 'leetcode', name: 'LeetCode', url: 'https://leetcode.cn/', desc: '算法刷题与题解' },
          { id: 'luogu', name: '洛谷', url: 'https://www.luogu.com.cn/', desc: '竞赛题单与评测' }
        ]
      },
      {
        id: 'g-tools', name: '常用工具', collapsed: false,
        links: [
          { id: 'github', name: 'GitHub', url: 'https://github.com/', desc: '代码托管与开源项目' },
          { id: 'yuque', name: '语雀', url: 'https://www.yuque.com/', desc: '笔记与文档协作' },
          { id: 'zhihu', name: '知乎', url: 'https://www.zhihu.com/', desc: '问答与经验帖' },
          { id: 'pan', name: '百度网盘', url: 'https://pan.baidu.com/', desc: '文件存储与分享' }
        ]
      }
    ]
  };

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function uid(prefix) {
    return (prefix || 'l') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clampText(v, max) {
    return String(v == null ? '' : v).trim().slice(0, max);
  }

  function domainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function tileColor(seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return TILE_COLORS[h % TILE_COLORS.length];
  }

  function normalizeUrl(input) {
    var u = String(input == null ? '' : input).trim();
    if (!u) return '';
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) {
      if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u)) u = 'https://' + u;
      else return '';
    }
    try {
      var p = new URL(u);
      if (p.protocol !== 'http:' && p.protocol !== 'https:') return '';
      return p.href;
    } catch (e) {
      return '';
    }
  }

  function normalizeData(raw) {
    var out = { version: 1, groups: [] };
    var src = raw && Array.isArray(raw.groups) ? raw.groups : [];
    src.forEach(function (g) {
      if (!g || typeof g !== 'object') return;
      var name = clampText(g.name, 30);
      if (!name) return;
      var links = [];
      (Array.isArray(g.links) ? g.links : []).forEach(function (l) {
        if (!l || typeof l !== 'object') return;
        var url = normalizeUrl(l.url);
        var lname = clampText(l.name, 60);
        if (!url || !lname) return;
        links.push({
          id: String(l.id || uid()),
          name: lname,
          url: url,
          desc: clampText(l.desc, 80)
        });
      });
      out.groups.push({
        id: String(g.id || uid('g')),
        name: name,
        collapsed: !!g.collapsed,
        links: links
      });
    });
    return out;
  }

  var state = null;

  function load() {
    var parsed = null;
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch (e) { parsed = null; }
    if (!parsed || !Array.isArray(parsed.groups)) {
      state = normalizeData(DEFAULT_DATA);
      return;
    }
    state = normalizeData(parsed);
  }

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      toast('保存失败：浏览器存储不可用或已满', true);
    }
  }

  var toastTimer = 0;
  function toast(message, isError) {
    var t = $('toast');
    if (!t) return;
    t.textContent = message;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------- 渲染 ---------- */

  function collectStats() {
    var groups = state.groups.length;
    var links = 0;
    state.groups.forEach(function (g) { links += g.links.length; });
    return { groups: groups, links: links };
  }

  function highlight(text, keyword) {
    var frag = document.createDocumentFragment();
    if (!keyword) { frag.appendChild(document.createTextNode(text)); return frag; }
    var lower = text.toLowerCase();
    var k = keyword.toLowerCase();
    var from = 0;
    var at = lower.indexOf(k);
    while (at !== -1) {
      if (at > from) frag.appendChild(document.createTextNode(text.slice(from, at)));
      frag.appendChild(el('mark', { class: 'hit', text: text.slice(at, at + k.length) }));
      from = at + k.length;
      at = lower.indexOf(k, from);
    }
    if (from < text.length) frag.appendChild(document.createTextNode(text.slice(from)));
    return frag;
  }

  function renderLink(link, keyword) {
    var nameNode = el('span', { class: 'link-name' });
    nameNode.appendChild(keyword ? highlight(link.name, keyword) : document.createTextNode(link.name));

    var meta = el('span', { class: 'link-meta' }, [
      nameNode,
      link.desc ? el('span', { class: 'link-desc' }, [
        keyword ? highlight(link.desc, keyword) : document.createTextNode(link.desc)
      ]) : null
    ]);

    var tile = el('span', { class: 'link-tile', 'aria-hidden': 'true' }, [
      (link.name[0] || '?').toUpperCase()
    ]);
    tile.style.background = tileColor(domainOf(link.url) || link.name);

    var tools = el('span', { class: 'link-tools' }, [
      el('span', {
        class: 'btn btn-icon', role: 'button', tabindex: '0',
        'aria-label': '编辑 ' + link.name, title: '编辑',
        text: '\u270E'
      }, []),
      el('span', {
        class: 'btn btn-icon btn-danger', role: 'button', tabindex: '0',
        'aria-label': '删除 ' + link.name, title: '删除',
        text: '\u00D7'
      }, [])
    ]);

    var item = el('a', {
      class: 'link-item',
      href: link.url,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: link.name + '\n' + link.url
    }, [tile, meta, tools]);

    item.dataset.linkId = link.id;
    item.dataset.groupId = '';
    return item;
  }

  function renderGroup(group, keyword) {
    var links = group.links;
    if (keyword) {
      links = links.filter(function (l) {
        return (l.name + ' ' + l.url + ' ' + l.desc).toLowerCase().indexOf(keyword) !== -1;
      });
    }
    if (keyword && !links.length) return null;

    var caret = el('svg', { class: 'icon icon-sm group-caret', viewBox: '0 0 24 24', 'aria-hidden': 'true' });
    caret.appendChild(el('polyline', { points: '6 9 12 15 18 9' }));

    var head = el('button', {
      type: 'button',
      class: 'group-head',
      'aria-expanded': group.collapsed && !keyword ? 'false' : 'true'
    }, [
      caret,
      el('span', { class: 'group-name', text: group.name }),
      el('span', { class: 'group-count', text: String(links.length) })
    ]);

    var body = el('div', { class: 'group-body' });
    links.forEach(function (link) {
      var node = renderLink(link, keyword);
      node.dataset.groupId = group.id;
      body.appendChild(node);
    });

    var section = el('section', { class: 'link-group' }, [head, body]);
    section.dataset.groupId = group.id;
    if (group.collapsed && !keyword) section.classList.add('collapsed');

    head.addEventListener('click', function () {
      group.collapsed = !group.collapsed;
      section.classList.toggle('collapsed', group.collapsed);
      head.setAttribute('aria-expanded', group.collapsed ? 'false' : 'true');
      persist();
    });

    return section;
  }

  function render() {
    var keyword = String(($('searchInput') || {}).value || '').trim().toLowerCase();
    var wrap = $('groupsWrap');
    wrap.textContent = '';

    var shownGroups = 0;
    state.groups.forEach(function (group) {
      var node = renderGroup(group, keyword);
      if (!node) return;
      shownGroups += 1;
      wrap.appendChild(node);
    });

    var stats = collectStats();
    $('statLinks').textContent = String(stats.links);
    $('statGroups').textContent = String(stats.groups);

    var emptyAll = $('emptyAll');
    var isEmpty = stats.links === 0;
    emptyAll.hidden = !isEmpty;

    var note = $('searchNote');
    if (keyword) {
      note.hidden = false;
      note.textContent = shownGroups
        ? '找到 ' + shownGroups + ' 个分组里的匹配网址'
        : '没有找到匹配「' + keyword + '」的网址';
    } else {
      note.hidden = true;
    }

    var clearBtn = $('clearSearch');
    if (clearBtn) clearBtn.hidden = !keyword;
  }

  /* ---------- 链接编辑 ---------- */

  var editingLink = null;

  function fillGroupSelect(select, selectedId) {
    select.textContent = '';
    state.groups.forEach(function (g) {
      select.appendChild(el('option', { value: g.id, text: g.name }));
    });
    select.appendChild(el('option', { value: '__new__', text: '\uFF0B 新建分组…' }));
    if (selectedId) select.value = selectedId;
    $('newGroupField').hidden = select.value !== '__new__';
  }

  function openLinkModal(groupId, link) {
    editingLink = link || null;
    $('linkModalTitle').textContent = link ? '编辑网址' : '添加网址';
    $('linkSubmitBtn').textContent = link ? '保存修改' : '保存网址';
    $('linkFormError').hidden = true;
    $('linkName').value = link ? link.name : '';
    $('linkUrl').value = link ? link.url : '';
    $('linkDesc').value = link ? link.desc : '';
    $('linkNewGroup').value = '';
    fillGroupSelect($('linkGroup'), groupId || (state.groups[0] && state.groups[0].id));
    openModal('linkModal');
    setTimeout(function () { $('linkName').focus(); }, 40);
  }

  function submitLink() {
    var name = clampText($('linkName').value, 60);
    var url = normalizeUrl($('linkUrl').value);
    var desc = clampText($('linkDesc').value, 80);
    var err = $('linkFormError');

    if (!name) { err.textContent = '请填写名称'; err.hidden = false; $('linkName').focus(); return; }
    if (!url) { err.textContent = '请填写有效网址（http:// 或 https://）'; err.hidden = false; $('linkUrl').focus(); return; }

    var groupId = $('linkGroup').value;
    if (groupId === '__new__') {
      var gname = clampText($('linkNewGroup').value, 30);
      if (!gname) { err.textContent = '请填写新分组名称'; err.hidden = false; $('linkNewGroup').focus(); return; }
      var ng = { id: uid('g'), name: gname, collapsed: false, links: [] };
      state.groups.push(ng);
      groupId = ng.id;
    }

    var target = null;
    state.groups.some(function (g) { if (g.id === groupId) { target = g; return true; } return false; });
    if (!target) target = state.groups[0];
    if (!target) {
      target = { id: uid('g'), name: '常用工具', collapsed: false, links: [] };
      state.groups.push(target);
    }

    if (editingLink) {
      var owner = null;
      state.groups.some(function (g) {
        var hit = g.links.some(function (l) { return l.id === editingLink.id; });
        if (hit) { owner = g; return true; }
        return false;
      });
      if (owner && owner !== target) {
        owner.links = owner.links.filter(function (l) { return l.id !== editingLink.id; });
        target.links.push({ id: editingLink.id, name: name, url: url, desc: desc });
      } else if (owner) {
        owner.links = owner.links.map(function (l) {
          return l.id === editingLink.id ? { id: l.id, name: name, url: url, desc: desc } : l;
        });
      }
      toast('已保存修改');
    } else {
      target.links.push({ id: uid(), name: name, url: url, desc: desc });
      toast('已添加「' + name + '」');
    }

    persist();
    closeModal('linkModal');
    render();
  }

  function deleteLink(groupId, linkId) {
    var group = null;
    state.groups.some(function (g) { if (g.id === groupId) { group = g; return true; } return false; });
    if (!group) return;
    var link = null;
    group.links.some(function (l) { if (l.id === linkId) { link = l; return true; } return false; });
    if (!link) return;
    if (!window.confirm('删除「' + link.name + '」？')) return;
    group.links = group.links.filter(function (l) { return l.id !== linkId; });
    persist();
    render();
    toast('已删除');
  }

  /* ---------- 分组管理 ---------- */

  function renderGroupManage() {
    var list = $('groupManageList');
    list.textContent = '';
    if (!state.groups.length) {
      list.appendChild(el('p', { class: 'hint', text: '还没有分组，先在上方新建一个。' }));
      return;
    }
    state.groups.forEach(function (group, index) {
      var input = el('input', { class: 'input', type: 'text', maxlength: '30', value: group.name, 'aria-label': '分组名称' });
      input.addEventListener('change', function () {
        var next = clampText(input.value, 30);
        if (!next) { input.value = group.name; return; }
        group.name = next;
        persist();
        render();
      });

      var row = el('div', { class: 'group-manage-row' }, [
        input,
        el('span', { class: 'gcount', text: String(group.links.length) }),
        el('button', { type: 'button', class: 'btn btn-icon', title: '上移', 'aria-label': '上移', text: '\u2191' }),
        el('button', { type: 'button', class: 'btn btn-icon', title: '下移', 'aria-label': '下移', text: '\u2193' }),
        el('button', { type: 'button', class: 'btn btn-icon btn-danger', title: '删除分组', 'aria-label': '删除分组', text: '\u00D7' })
      ]);

      var buttons = row.querySelectorAll('button');
      if (index === 0) buttons[0].disabled = true;
      if (index === state.groups.length - 1) buttons[1].disabled = true;

      buttons[0].addEventListener('click', function () {
        if (index === 0) return;
        state.groups.splice(index - 1, 0, state.groups.splice(index, 1)[0]);
        persist(); renderGroupManage(); render(); refreshGroupSelect();
      });
      buttons[1].addEventListener('click', function () {
        if (index === state.groups.length - 1) return;
        state.groups.splice(index + 1, 0, state.groups.splice(index, 1)[0]);
        persist(); renderGroupManage(); render(); refreshGroupSelect();
      });
      buttons[2].addEventListener('click', function () {
        var tip = group.links.length
          ? '分组「' + group.name + '」里还有 ' + group.links.length + ' 个网址，删除后一并消失。确定？'
          : '删除空分组「' + group.name + '」？';
        if (!window.confirm(tip)) return;
        state.groups = state.groups.filter(function (g) { return g.id !== group.id; });
        persist(); renderGroupManage(); render(); refreshGroupSelect();
        toast('已删除分组');
      });

      list.appendChild(row);
    });
  }

  function refreshGroupSelect() {
    var select = $('linkGroup');
    if (!select) return;
    var current = select.value;
    fillGroupSelect(select, state.groups.some(function (g) { return g.id === current; }) ? current : undefined);
  }

  /* ---------- 导入导出 ---------- */

  function exportData() {
    var payload = {
      app: '安大学生工具箱 · 网址集成',
      version: 1,
      exportedAt: new Date().toISOString(),
      groups: state.groups
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var d = new Date();
    var stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    var a = el('a', { href: URL.createObjectURL(blob), download: 'my-links-' + stamp + '.json' });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    toast('已导出 ' + collectStats().links + ' 个网址');
  }

  function importData(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = null;
      try { parsed = JSON.parse(String(reader.result)); } catch (e) { parsed = null; }
      var next = normalizeData(parsed);
      if (!next.groups.length) { toast('文件里没有可用的网址数据', true); return; }
      if (!window.confirm('导入会覆盖当前全部网址（现有 ' + collectStats().links + ' 个）。继续？')) return;
      state = next;
      persist();
      render();
      renderGroupManage();
      refreshGroupSelect();
      toast('已导入 ' + collectStats().links + ' 个网址');
    };
    reader.onerror = function () { toast('读取文件失败', true); };
    reader.readAsText(file, 'utf-8');
  }

  /* ---------- 弹窗与主题 ---------- */

  function openModal(id) {
    var m = $(id);
    if (!m) return;
    m.classList.add('show');
    m.setAttribute('aria-hidden', 'false');
  }

  function closeModal(id) {
    var m = $(id);
    if (!m) return;
    m.classList.remove('show');
    m.setAttribute('aria-hidden', 'true');
  }

  function initTheme() {
    var dark = false;
    try { dark = localStorage.getItem(THEME_KEY) === 'true'; } catch (e) { dark = false; }
    var btn = $('themeToggle');
    function apply(next) {
      dark = next;
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      try { localStorage.setItem(THEME_KEY, dark ? 'true' : 'false'); } catch (e) {}
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#0d0e13' : '#f5f6f8');
      if (btn) btn.textContent = dark ? '浅色' : '深色';
    }
    apply(dark);
    if (btn) btn.addEventListener('click', function () { apply(!dark); });
  }

  /* ---------- 事件绑定 ---------- */

  function initEvents() {
    $('addLinkBtn').addEventListener('click', function () { openLinkModal(); });
    $('emptyAddBtn').addEventListener('click', function () { openLinkModal(); });
    $('restoreDefaultsBtn').addEventListener('click', function () {
      if (!state.groups.length && !window.confirm('恢复内置的常用网址？')) return;
      state = normalizeData(DEFAULT_DATA);
      persist(); render(); renderGroupManage(); refreshGroupSelect();
      toast('已恢复默认网址');
    });

    $('manageGroupsBtn').addEventListener('click', function () {
      renderGroupManage();
      openModal('groupModal');
    });
    $('createGroupBtn').addEventListener('click', function () {
      var name = clampText($('newGroupName').value, 30);
      if (!name) { toast('请先输入分组名称', true); return; }
      state.groups.push({ id: uid('g'), name: name, collapsed: false, links: [] });
      $('newGroupName').value = '';
      persist(); renderGroupManage(); render(); refreshGroupSelect();
      toast('已新建分组「' + name + '」');
    });

    $('exportBtn').addEventListener('click', exportData);
    $('importBtn').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0];
      importData(file);
      event.target.value = '';
    });

    var searchInput = $('searchInput');
    var searchTimer = 0;
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 120);
    });
    $('clearSearch').addEventListener('click', function () {
      searchInput.value = '';
      searchInput.focus();
      render();
    });

    $('linkGroup').addEventListener('change', function () {
      $('newGroupField').hidden = $('linkGroup').value !== '__new__';
    });

    $('linkForm').addEventListener('submit', function (event) {
      event.preventDefault();
      submitLink();
    });

    document.addEventListener('click', function (event) {
      var closeBtn = event.target.closest('[data-close]');
      if (closeBtn) {
        closeModal(closeBtn.getAttribute('data-close'));
        return;
      }
      var item = event.target.closest('.link-item');
      if (!item) return;
      var tools = event.target.closest('.link-tools');
      if (tools) {
        event.preventDefault();
        var groupId = item.dataset.groupId;
        var linkId = item.dataset.linkId;
        var group = null;
        state.groups.some(function (g) { if (g.id === groupId) { group = g; return true; } return false; });
        var link = null;
        if (group) group.links.some(function (l) { if (l.id === linkId) { link = l; return true; } return false; });
        if (!link) return;
        if (event.target === tools.children[1] || tools.children[1].contains(event.target)) {
          deleteLink(groupId, linkId);
        } else {
          openLinkModal(groupId, link);
        }
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeModal('linkModal');
        closeModal('groupModal');
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && event.target.classList && event.target.classList.contains('btn-icon') && event.target.getAttribute('role') === 'button') {
        event.preventDefault();
        event.target.click();
      }
    });

    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeModal(overlay.id);
      });
    });
  }

  function init() {
    load();
    initTheme();
    initEvents();
    refreshGroupSelect();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
