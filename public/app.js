
let allJobs = [];
const msgEl = document.getElementById('status');
const gridEl = document.getElementById('results');

function setMsg(text, type = '') {
    msgEl.textContent = text;
    msgEl.className = type ? `msg ${type}` : 'status';
}

function render() {
    const term = document.getElementById('filterInput').value.trim().toLowerCase();
    const remoteOnly = document.getElementById('remoteOnly').checked;
    const sortBy = document.getElementById('sortSelect').value;
    const type = document.getElementById('typefilter').value;

    const list = allJobs
        .filter((j) => {
            if (remoteOnly && !j.isRemote) return false;
            if (type && !(j.employmentType || '').toLowerCase().includes(type)) return false;
            if (!term) return true;
            return (
                j.title.toLowerCase().includes(term) ||
                j.employer.toLowerCase().includes(term) ||
                j.location.toLowerCase().includes(term)
            );
        })
        .sort((a, b) => {
            if (sortBy === 'oldest') return (Date.parse(a.postedAt) || 0) - (Date.parse(b.postedAt) || 0);
            if (sortBy === 'company') return a.employer.localeCompare(b.employer);
            if (sortBy === 'newest') return (Date.parse(b.postedAt) || 0) - (Date.parse(a.postedAt) || 0);
            return 0;
        });
gridEl.innerHTML = '';
if (!list.length) {
    gridEl.innerHTML = '<p>No jobs match your current view.</p>';
    return;
}  

for (const job of list) {
    const card = document.createElement('article');
    card.className = 'card';
    const dateStr = job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'Recent';
    card.innerHTML = `
    <h3>${escapeHtml(job.title)}</h3>
    <div class="employer">${escapeHtml(job.employer)}</div>
    <div class="meta">${escapeHtml(job.location)} . ${escapeHtml(dateStr)}</div>
    <p class="summary">${escapeHtml(job.summary)}</p>
    ${job.applyLink ? `<a href="${escapeAttr(job.applyLink)}" target="_blank" rel="noopener noreferrer">Apply</a>` : ''}`;
    gridEl.appendChild(card);
}
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',

    }[c]))
}

function escapeAttr(url) {
    return /^https?:\/\//i.test(url) ? escapeHtml(url) : '#';
}

document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('queryInput').value.trim();
    const country = document.getElementById('country').value.trim() || 'us' ;
    setMsg('Searching Jsearch ...', 'info');

    try {
        const res = await fetch('/api/jobs?query=' + encodeURIComponent(query) + '&country=' + encodeURIComponent(country));
        const data = await res.json();
        if (data.servedBy) {
            document.getElementById('server-label').textContent = `served by: ${data.servedBy}`;
        }

        if (!res.ok) {
            allJobs = [];
            render();
            setMsg(data.error || 'Error fetching jobs.', 'error');
            return;
        }

        allJobs =data.jobs || [];
        render();
        setMsg(
            data.fromCache
            ? 'Loaded from cache (no extra API credit used).'
            : `Found ${allJobs.length} jobs.`,
            'info'
        );
    } catch (err) {
        console.error('Frontend error:', err);
        setMsg('Network error contacting server.', 'error');

    }
});

['filterInput', 'remoteOnly', 'sortSelect', 'typefilter'].forEach((id) => {
    document.getElementById(id).addEventListener('input', render);
    document.getElementById(id).addEventListener('change', render);
});

fetch('/health')
   .then((r) => r.json())
   .then((d) => {
    if (d.server) {
        document.getElementById('server-label').textContent = `served by: ${d.server}`;
    }
   })
   .catch(() => {});