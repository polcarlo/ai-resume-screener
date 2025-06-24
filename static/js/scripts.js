const sections = {
  upload: 'uploadSection',
  ranking:'rankingSection',
  analytics:'analyticsSection',
  history: 'historySection',
  candidates: 'candidatesSection',
  settings: 'settingsSection'
};

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('#sidebar .list-group-item').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('#sidebar .list-group-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      Object.values(sections).forEach(id => document.getElementById(id).classList.add('d-none'));
      document.getElementById(sections[el.dataset.sec]).classList.remove('d-none');
      if (el.dataset.sec === 'ranking') initRankingView();
      if (el.dataset.sec === 'candidates') initCandidatesView();
      if (el.dataset.sec === 'analytics') initAnalytics();
      if (el.dataset.sec === 'history') refreshHistory();
    });
  });
  
  initFileUploads();
  await fetchJobs();
  document.querySelector('[data-sec="upload"]').click();
  
  document.getElementById('listViewBtn').onclick = () => {
    document.getElementById('listView').classList.remove('d-none');
    document.getElementById('gridView').classList.add('d-none');
    document.querySelectorAll('.view-toggle').forEach(btn => btn.classList.remove('active'));
    document.getElementById('listViewBtn').classList.add('active');
  };
  
  document.getElementById('gridViewBtn').onclick = () => {
    document.getElementById('listView').classList.add('d-none');
    document.getElementById('gridView').classList.remove('d-none');
    document.querySelectorAll('.view-toggle').forEach(btn => btn.classList.remove('active'));
    document.getElementById('gridViewBtn').classList.add('active');
  };
});

function initFileUploads() {
  const jobInput = document.getElementById('jobFileInput');
  const jobLabel = document.querySelector('label[for="jobFileInput"]');
  const resumeInput = document.getElementById('resumeFileInput');
  const resumeLabel = document.querySelector('label[for="resumeFileInput"]');
  
  jobInput.addEventListener('change', () => {
    if (jobInput.files.length > 0) {
      jobLabel.querySelector('p').textContent = jobInput.files[0].name;
      jobLabel.classList.add('border-primary');
    }
  });
  
  jobLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    jobLabel.classList.add('drag-over');
  });
  
  jobLabel.addEventListener('dragleave', () => {
    jobLabel.classList.remove('drag-over');
  });
  
  jobLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    jobLabel.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      jobInput.files = e.dataTransfer.files;
      jobLabel.querySelector('p').textContent = e.dataTransfer.files[0].name;
      jobLabel.classList.add('border-primary');
    }
  });
  
  resumeInput.addEventListener('change', () => {
    if (resumeInput.files.length > 0) {
      resumeLabel.querySelector('p').textContent = 
        `${resumeInput.files.length} file${resumeInput.files.length > 1 ? 's' : ''} selected`;
      resumeLabel.classList.add('border-primary');
    }
  });
  
  resumeLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    resumeLabel.classList.add('drag-over');
  });
  
  resumeLabel.addEventListener('dragleave', () => {
    resumeLabel.classList.remove('drag-over');
  });
  
  resumeLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    resumeLabel.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      resumeInput.files = e.dataTransfer.files;
      resumeLabel.querySelector('p').textContent = 
        `${e.dataTransfer.files.length} file${e.dataTransfer.files.length > 1 ? 's' : ''} selected`;
      resumeLabel.classList.add('border-primary');
    }
  });
}

async function fetchJobs() {
  try {
    const response = await fetch('/api/jobs');
    const jobs = await response.json();
    
    const jobSelects = [
      document.getElementById('jobSelect'),
      document.getElementById('rankingJobSelect'),
      document.getElementById('candJobFilter'),
      document.getElementById('analyticsJobSelect')
    ];
    
    jobSelects.forEach(select => {
      select.innerHTML = '<option value="">Select Job…</option>';
      jobs.forEach(job => {
        const option = document.createElement('option');
        option.value = job.id;
        option.textContent = job.title || job.filename;
        select.appendChild(option);
      });
    });
    
    return jobs;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    showError('Failed to load jobs. Please try again later.');
    return [];
  }
}

async function fetchCandidates(jobId) {
  if (!jobId) return [];
  try {
    const response = await fetch(`/api/jobs/${jobId}/candidates`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching candidates:', error);
    showError('Failed to load candidates. Please try again later.');
    return [];
  }
}

async function fetchAllCandidates() {
  try {
    const response = await fetch('/api/candidates');
    return await response.json();
  } catch (error) {
    console.error('Error fetching all candidates:', error);
    showError('Failed to load candidates. Please try again later.');
    return [];
  }
}

async function fetchAnalytics(jobId) {
  if (!jobId) return null;
  try {
    const response = await fetch(`/api/analytics/${jobId}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching analytics:', error);
    showError('Failed to load analytics data. Please try again later.');
    return null;
  }
}

async function markCandidateReviewed(candidateId, reviewed) {
  try {
    const response = await fetch('/api/mark_reviewed', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ candidate_id: candidateId, reviewed })
    });
    return await response.json();
  } catch (error) {
    console.error('Error marking candidate:', error);
    return { error: 'Failed to update candidate status' };
  }
}

async function initRankingView() {
  const jobSelect = document.getElementById('rankingJobSelect');
  const skillFilter = document.getElementById('skillFilter');
  const searchInput = document.getElementById('searchInput');
  let allCandidates = [];

  jobSelect.onchange = async () => {
    allCandidates = jobSelect.value ? await fetchCandidates(jobSelect.value) : [];
    const skills = [...new Set(allCandidates.flatMap(c => c.skills))];
    skillFilter.innerHTML = '<option value="">All Skills</option>' +
      skills.map(s => `<option value="${s}">${s}</option>`).join('');
    searchInput.value = '';
    skillFilter.onchange = applyFilters;
    searchInput.oninput = applyFilters;
    renderRanking(allCandidates);
  };

  function applyFilters() {
    let filtered = allCandidates;
    if (skillFilter.value) {
      filtered = filtered.filter(c => c.skills.includes(skillFilter.value));
    }
    if (searchInput.value) {
      const term = searchInput.value.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.skills.some(s => s.toLowerCase().includes(term))
      );
    }
    renderRanking(filtered);
  }

  if (jobSelect.value) jobSelect.onchange();
}


function renderRanking(candidates) {
  const listContent = document.getElementById('rankingListContent');
  const gridContent = document.getElementById('gridView');
  
  document.getElementById('rankingCount').textContent = candidates.length;
  
  listContent.innerHTML = '';
  gridContent.innerHTML = '';
  
  if (candidates.length === 0) {
    listContent.innerHTML = `
      <div class="row align-items-center py-5 text-center">
        <div class="col-12">
          <i class="bi bi-people fs-1 text-muted mb-3"></i>
          <h5 class="mb-2">No candidates found</h5>
          <p class="text-muted">Try selecting a different job or upload new resumes</p>
        </div>
      </div>
    `;
    return;
  }
  
  candidates.forEach((candidate, index) => {
    const skillsHtml = candidate.skills.slice(0, 5).map(skill => 
      `<span class="badge skill-badge">${skill}</span>`
    ).join('');
    
    const statusClass = candidate.reviewed ? 'bg-success' : 'bg-warning';
    const statusText = candidate.reviewed ? 'Reviewed' : 'Pending';
    
    const listItem = document.createElement('div');
    listItem.className = 'row align-items-center py-3 border-bottom';
    listItem.innerHTML = `
      <div class="col-1 fw-bold text-primary">${index + 1}</div>
      <div class="col-3">
        <div class="d-flex align-items-center">
          <div class="bg-light rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
            <i class="bi bi-person"></i>
          </div>
          <div>
            <div class="fw-medium">${candidate.name}</div>
            <div class="small text-muted">${candidate.experience.length > 0 ? candidate.experience[0] : 'Experience not specified'}</div>
          </div>
        </div>
      </div>
      <div class="col-3">${skillsHtml}</div>
      <div class="col-2">
        <div class="match-percent">${candidate.similarity_pct}%</div>
        <div class="progress mt-1">
          <div class="progress-bar" role="progressbar" style="width: ${candidate.similarity_pct}%"></div>
        </div>
      </div>
      <div class="col-3">
        <div class="d-flex">
          <button class="btn btn-sm btn-outline-primary me-2 view-detail" data-id="${candidate.id}">
            <i class="bi bi-eye"></i>
          </button>
          <a href="/uploads/${encodeURIComponent(candidate.filename)}" target="_blank" class="btn btn-sm btn-outline-primary me-2">
            <i class="bi bi-file-earmark-pdf"></i>
          </a>
          <button class="btn btn-sm ${candidate.reviewed ? 'btn-success' : 'btn-outline-success'} mark-reviewed" data-id="${candidate.id}">
            <i class="bi ${candidate.reviewed ? 'bi-check-circle-fill' : 'bi-check-circle'}"></i> ${statusText}
          </button>
        </div>
      </div>
    `;
    listContent.appendChild(listItem);
    
    listItem.querySelector('.view-detail').onclick = () => showCandidateDetail(candidate);
    listItem.querySelector('.mark-reviewed').onclick = async () => {
      const newStatus = !candidate.reviewed;
      const result = await markCandidateReviewed(candidate.id, newStatus);
      if (result.success) {
        candidate.reviewed = newStatus;
        renderRanking(candidates);
      }
    };
  });
  
  candidates.forEach((candidate, index) => {
    const skillsHtml = candidate.skills.slice(0, 4).map(skill => 
      `<span class="badge skill-badge">${skill}</span>`
    ).join('');
    
    const statusClass = candidate.reviewed ? 'bg-success' : 'bg-warning';
    const statusText = candidate.reviewed ? 'Reviewed' : 'Pending';
    
    const gridItem = document.createElement('div');
    gridItem.className = 'col';
    gridItem.innerHTML = `
      <div class="card candidate-card h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="fw-bold text-primary fs-5">#${index + 1}</div>
            <div class="match-percent">${candidate.similarity_pct}%</div>
          </div>
          
          <div class="text-center mb-3">
            <div class="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2" style="width: 80px; height: 80px;">
              <i class="bi bi-person fs-2"></i>
            </div>
            <h5 class="mb-1">${candidate.name}</h5>
            <p class="text-muted small mb-0">${candidate.experience.length > 0 ? candidate.experience[0] : 'Experience not specified'}</p>
          </div>
          
          <div class="mb-3">
            <div class="progress" style="height: 8px;">
              <div class="progress-bar" role="progressbar" style="width: ${candidate.similarity_pct}%"></div>
            </div>
          </div>
          
          <div class="mb-3">
            <label class="form-label small text-muted mb-1">TOP SKILLS</label>
            <div>${skillsHtml}</div>
          </div>
          
          <div class="d-flex justify-content-between mt-auto pt-2">
            <button class="btn btn-sm btn-outline-primary view-detail" data-id="${candidate.id}">
              <i class="bi bi-eye me-1"></i> Details
            </button>
            <a href="/uploads/${encodeURIComponent(candidate.filename)}" target="_blank" class="btn btn-sm btn-outline-primary me-2">
              <i class="bi bi-file-earmark-pdf me-1"></i> CV
            </a>
            <button class="btn btn-sm ${candidate.reviewed ? 'btn-success' : 'btn-outline-success'} mark-reviewed" data-id="${candidate.id}">
              <i class="bi ${candidate.reviewed ? 'bi-check-circle-fill' : 'bi-check-circle'} me-1"></i> ${statusText}
            </button>
          </div>
        </div>
      </div>
    `;
    gridContent.appendChild(gridItem);
    
    gridItem.querySelector('.view-detail').onclick = () => showCandidateDetail(candidate);
    gridItem.querySelector('.mark-reviewed').onclick = async () => {
      const newStatus = !candidate.reviewed;
      const result = await markCandidateReviewed(candidate.id, newStatus);
      if (result.success) {
        candidate.reviewed = newStatus;
        renderRanking(candidates);
      }
    };
  });
}

async function initCandidatesView() {
  const jobFilter = document.getElementById('candJobFilter');
  const statusFilter = document.getElementById('candStatusFilter');
  const searchInput = document.getElementById('candSearch');
  
  window.allCandidates = await fetchAllCandidates();
  renderAllCandidates();
  
  jobFilter.onchange = renderAllCandidates;
  statusFilter.onchange = renderAllCandidates;
  searchInput.oninput = renderAllCandidates;
  
  document.getElementById('resetDoneAll').onclick = async () => {
    const result = await fetch('/api/reset_reviewed', { method: 'POST' });
    if (result.ok) {
      window.allCandidates = await fetchAllCandidates();
      renderAllCandidates();
    }
  };
}

function renderAllCandidates() {
  const jobId = document.getElementById('candJobFilter').value;
  const status = document.getElementById('candStatusFilter').value;
  const search = document.getElementById('candSearch').value.toLowerCase();
  const tbody = document.getElementById('candTableBody');
  
  let filtered = window.allCandidates.filter(candidate => {
    const matchesJob = !jobId || candidate.job_id == jobId;
    const matchesStatus = !status || 
      (status === 'pending' && !candidate.reviewed) ||
      (status === 'reviewed' && candidate.reviewed);
    const matchesSearch = !search || 
      candidate.name.toLowerCase().includes(search) ||
      candidate.skills.some(skill => skill.toLowerCase().includes(search)) ||
      candidate.job_title.toLowerCase().includes(search);
      
    return matchesJob && matchesStatus && matchesSearch;
  });
  
  const reviewedCount = filtered.filter(c => c.reviewed).length;
  const pendingCount = filtered.length - reviewedCount;
  
  document.getElementById('candStats').innerHTML = `
    <span class="fw-medium">Total:</span> ${filtered.length} | 
    <span class="text-warning fw-medium">Pending:</span> ${pendingCount} | 
    <span class="text-success fw-medium">Reviewed:</span> ${reviewedCount}
  `;
  
  document.getElementById('candCount').textContent = filtered.length;
  tbody.innerHTML = '';
  
  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5">
          <div class="d-flex flex-column align-items-center justify-content-center">
            <i class="bi bi-people fs-1 text-muted mb-3"></i>
            <h5 class="mb-2">No matching candidates</h5>
            <p class="text-muted mb-0">Try changing your filters or search terms</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  filtered.forEach((candidate, index) => {
    const skillsHtml = candidate.skills.slice(0, 3).map(skill => 
      `<span class="badge skill-badge">${skill}</span>`
    ).join('');
    
    const statusBadge = candidate.reviewed ? 
      '<span class="badge bg-success"><span class="status-indicator status-reviewed"></span>Reviewed</span>' : 
      '<span class="badge bg-warning"><span class="status-indicator status-pending"></span>Pending</span>';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="fw-medium">${index + 1}</td>
      <td>
        <div class="d-flex align-items-center">
          <div class="bg-light rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 36px; height: 36px;">
            <i class="bi bi-person"></i>
          </div>
          <div>${candidate.name}</div>
        </div>
      </td>
      <td>${candidate.job_title}</td>
      <td>
        <div class="fw-bold text-primary">${candidate.similarity_pct}%</div>
        <div class="progress" style="height: 5px;">
          <div class="progress-bar" style="width: ${candidate.similarity_pct}%"></div>
        </div>
      </td>
      <td>${skillsHtml}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary action-btn view-detail">
          <i class="bi bi-eye"></i>
        </button>
        <a href="/uploads/${encodeURIComponent(candidate.filename)}" target="_blank" class="btn btn-sm btn-outline-primary action-btn">
          <i class="bi bi-file-earmark-pdf"></i>
        </a>
        <button class="btn btn-sm ${candidate.reviewed ? 'btn-success' : 'btn-outline-success'} action-btn mark-reviewed">
          <i class="bi ${candidate.reviewed ? 'bi-check-circle-fill' : 'bi-check-circle'}"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
    
    row.querySelector('.view-detail').onclick = () => showCandidateDetail(candidate);
    row.querySelector('.mark-reviewed').onclick = async () => {
      const newStatus = !candidate.reviewed;
      const result = await markCandidateReviewed(candidate.id, newStatus);
      if (result.success) {
        candidate.reviewed = newStatus;
        renderAllCandidates();
      }
    };
  });
}

function showCandidateDetail(candidate) {
  document.getElementById('modalName').textContent = candidate.name;
  document.getElementById('modalJob').textContent = candidate.job_title;
  document.getElementById('modalMatch').textContent = `${candidate.similarity_pct}%`;
  document.getElementById('modalViewCV').href = `/uploads/${encodeURIComponent(candidate.filename)}`;
  
  const skillsContainer = document.getElementById('modalSkills');
  skillsContainer.innerHTML = '';
  candidate.skills.slice(0, 10).forEach(skill => {
    const badge = document.createElement('span');
    badge.className = 'badge skill-badge';
    badge.textContent = skill;
    skillsContainer.appendChild(badge);
  });
  
  document.getElementById('modalExp').textContent = candidate.experience.join(', ') || 'Not specified';
  document.getElementById('modalEdu').textContent = candidate.education.join(', ') || 'Not specified';
  document.getElementById('modalCert').textContent = candidate.certifications.join(', ') || 'None';
  
  const keywordsContainer = document.getElementById('modalKeywords');
  keywordsContainer.innerHTML = '';
  candidate.keywords.slice(0, 15).forEach(keyword => {
    const badge = document.createElement('span');
    badge.className = 'badge keyword-badge';
    badge.textContent = keyword;
    keywordsContainer.appendChild(badge);
  });
  
  const markBtn = document.getElementById('modalMarkReviewed');
  markBtn.disabled = candidate.reviewed;
  markBtn.innerHTML = candidate.reviewed ? 
    '<i class="bi bi-check-circle-fill me-1"></i> Reviewed' : 
    '<i class="bi bi-check-circle me-1"></i> Mark as Reviewed';
  
  markBtn.onclick = async () => {
    if (!candidate.reviewed) {
      const result = await markCandidateReviewed(candidate.id, true);
      if (result.success) {
        candidate.reviewed = true;
        markBtn.disabled = true;
        markBtn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Reviewed';
      }
    }
  };
  const insightsList = document.querySelector('#candidateModal .card-body ul');
  insightsList.innerHTML = ''; 
  const insights = [];
  if (candidate.similarity_pct > 90) insights.push('Excellent overall match');
  if (candidate.skills.length < 3)   insights.push('Consider if skill set is too narrow');
  if (!candidate.certifications.length) insights.push('No certifications listed — verify requirements');

  const mustHave = ['leadership','communication']; 
  mustHave.forEach(skill => {
    if (!candidate.skills.includes(skill))
      insights.push(`Missing key skill: ${skill}`);
  });
  insights.forEach(text => {
    const li = document.createElement('li');
    li.className = 'list-group-item px-0 py-1 d-flex';
    li.innerHTML = `<i class="bi bi-info-circle-fill text-info me-2"></i>${text}`;
    insightsList.appendChild(li);
  });
  
  const modal = new bootstrap.Modal(document.getElementById('candidateModal'));
  modal.show();
}

async function initAnalytics() {
  const jobSelect = document.getElementById('analyticsJobSelect');
  jobSelect.onchange = async () => {
    if (!jobSelect.value) return;
    const analyticsData = await fetchAnalytics(jobSelect.value);
    if (!analyticsData) return;
    setTimeout(() => renderAnalytics(analyticsData), 0);
  };
  
  if (jobSelect.value) {
    const analyticsData = await fetchAnalytics(jobSelect.value);
    if (analyticsData) {
      renderAnalytics(analyticsData);
    }
  }
}

function renderAnalytics(data) {
  document.getElementById('avgMatch').textContent = data.similarity_scores.length ? 
    (data.similarity_scores.reduce((a, b) => a + b, 0) / data.similarity_scores.length).toFixed(1) + '%' : '0%';
  
  document.getElementById('topMatch').textContent = data.similarity_scores.length ? 
    Math.max(...data.similarity_scores).toFixed(1) + '%' : '0%';
  
  document.getElementById('candidateCount').textContent = data.candidate_count;
  document.getElementById('reviewedCount').textContent = `${data.reviewed_count} reviewed`;
  document.getElementById('pendingCount').textContent = `${data.pending_count} pending`;
  
  if (data.top_skills.length > 0) {
    document.getElementById('topSkill').textContent = data.top_skills[0][0];
    document.getElementById('topSkillFreq').textContent = 
      `Appears in ${((data.top_skills[0][1] / data.candidate_count) * 100).toFixed(1)}% of candidates`;
  } else {
    document.getElementById('topSkill').textContent = 'N/A';
    document.getElementById('topSkillFreq').textContent = 'No skills data';
  }
  
 
  const allSkills = data.skills_detail.flat();
  const uniqueSkills = [...new Set(allSkills)];
  const skillsList = document.getElementById('allSkillsList');
  skillsList.innerHTML = '';
  uniqueSkills.forEach(skill => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = skill;
    skillsList.appendChild(li);
  });
   renderCharts(data);
}

function renderCharts(data) {
  renderScoreChart(data.similarity_scores);
  renderStatusChart(data.reviewed_count, data.pending_count);
  renderSkillsChart(data.top_skills);
}

function renderScoreChart(scores) {
  const ctx = document.getElementById('scoreChart').getContext('2d');
  
  const bins = [0, 0, 0, 0, 0, 0];
  scores.forEach(score => {
    if (score < 50) bins[0]++;
    else if (score < 60) bins[1]++;
    else if (score < 70) bins[2]++;
    else if (score < 80) bins[3]++;
    else if (score < 90) bins[4]++;
    else bins[5]++;
  });
  
  if (window.scoreChart) window.scoreChart.destroy();
  
  window.scoreChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['<50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'],
      datasets: [{
        label: 'Candidates',
        data: bins,
        backgroundColor: [
          '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#4361ee'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderStatusChart(reviewed, pending) {
  const ctx = document.getElementById('statusChart').getContext('2d');
  
  if (window.statusChart) window.statusChart.destroy();
  
  window.statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Reviewed'],
      datasets: [{
        data: [pending, reviewed],
        backgroundColor: ['#ffd166', '#06d6a0'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderSkillsChart(topSkills) {
  const ctx = document.getElementById('skillsChart').getContext('2d');
  const labels = topSkills.map(skill => skill[0]);
  const data = topSkills.map(skill => skill[1]);
  
  if (window.skillsChart) window.skillsChart.destroy();
  
  window.skillsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Frequency',
        data: data,
        backgroundColor: '#4361ee',
        borderWidth: 0
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

async function refreshHistory() {
  try {
    const jobs = await fetchJobs();
    const historyTable = document.getElementById('historyTable');
    historyTable.innerHTML = '';
    
    if (jobs.length === 0) {
      historyTable.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-5">
            <div class="d-flex flex-column align-items-center justify-content-center">
              <i class="bi bi-clock-history fs-1 text-muted mb-3"></i>
              <h5 class="mb-2">No screening history</h5>
              <p class="text-muted mb-0">Your screening sessions will appear here</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    jobs.forEach(job => {
      const date = new Date(job.created_at).toLocaleDateString();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${date}</td>
        <td>${job.title || job.filename}</td>
        <td>${job.candidate_count || 0}</td>
        <td>
          <span class="fw-medium">${job.top_match || 0}%</span>
          <div class="progress mt-1" style="height: 5px;">
            <div class="progress-bar" style="width: ${job.top_match || 0}%"></div>
          </div>
        </td>
        <td>
          <span class="badge bg-success">Completed</span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary action-btn view-job" data-id="${job.id}">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      `;
      historyTable.appendChild(row);
      
      row.querySelector('.view-job').onclick = () => {
        document.querySelector(`#rankingJobSelect option[value="${job.id}"]`).selected = true;
        document.querySelector('[data-sec="ranking"]').click();
      };
    });
  } catch (error) {
    console.error('Error refreshing history:', error);
    showError('Failed to load history. Please try again later.');
  }
}

function showError(message) {
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: message,
    confirmButtonColor: '#4361ee'
  });
}

document.getElementById('uploadJobForm').onsubmit = async e => {
  e.preventDefault();
  document.getElementById('loading').classList.remove('d-none');
  try {
    const formData = new FormData(e.target);
    const response = await fetch('/upload_job', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      let errMsg = 'Upload failed';
      try {
        const json = await response.json();
        if (json.error) errMsg = json.error;
      } catch (_) {}
      throw new Error(errMsg);
    }

    await fetchJobs();
    Swal.fire({
      icon: 'success',
      title: 'Job Uploaded!',
      text: 'Your job description has been processed successfully',
      timer: 2000,
      showConfirmButton: false
    });
  } catch (err) {
    console.error('Job upload error:', err);
    showError(`Failed to upload job description: ${err.message}`);
  } finally {
    document.getElementById('loading').classList.add('d-none');
  }
};

document.getElementById('uploadResumesForm').onsubmit = async e => {
  e.preventDefault();
  document.getElementById('loading').classList.remove('d-none');
  try {
    const formData = new FormData(e.target);
    const response = await fetch('/upload_resumes', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Upload failed');
    }

    Swal.fire({
      icon: 'success',
      title: 'Resumes Processed!',
      html: `Successfully processed <b>${result.candidates.length}</b> resumes`,
      timer: 2000,
      showConfirmButton: false
    });
  } catch (err) {
    console.error('Resume upload error:', err);
    showError(`Failed to process resumes: ${err.message}`);
  } finally {
    document.getElementById('loading').classList.add('d-none');
  }
};

function exportToCSV(dataArray, columns, filename) {
   const csvRows = [ columns.join(','), 
     ...dataArray.map(row => columns.map(col => `"${row[col]||''}"`).join(',')) 
   ];
   const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
   const url  = URL.createObjectURL(blob);
   const a    = document.createElement('a');
   a.href     = url;
   a.download = filename;
   a.click();
   URL.revokeObjectURL(url);
 }

 document.getElementById('exportRankingBtn').onclick = () => {
   exportToCSV(
     allCandidates,
     ['name','job_title','similarity_pct'],
     'candidate_ranking.csv'
   );
 };

 document.getElementById('exportCandidatesBtn').onclick = () => {
   exportToCSV(
     window.allCandidates,
     ['name','job_title','similarity_pct','reviewed'],
     'all_candidates.csv'
   );
 };

document.getElementById('refreshHistory').onclick = refreshHistory;