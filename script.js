let tournamentRounds = [];
let matchHistory = [];
let activeMatchRef = null; 

let timerInterval = null;
let remainingSeconds = 600;

// Expanded Sport Options Config Matrix
const sportThemes = {
  basketball: {
    title: "🏀 Basketball Tournament Arena",
    bg: "url('imagecourt.jpg')",
    primaryColor: "#ff8c00",
    pointOptions: [1, 2, 3]
  },
  soccer: {
    title: "⚽ Soccer Tournament Arena",
    bg: "url('soccerfield.jpg')",
    primaryColor: "#4CAF50",
    pointOptions: [1]
  },
  volleyball: {
    title: "🏐 Volleyball Tournament Arena",
    bg: "url('volleyballcourt.jpg')",
    primaryColor: "#FFEB3B",
    pointOptions: [1]
  },
  badminton: {
    title: "🏸 Badminton Tournament Arena",
    bg: "url('badmintoncourt.jpg')",
    primaryColor: "#2196F3",
    pointOptions: [1]
  },
  tennis: {
    title: "🎾 Tennis Tournament Arena",
    bg: "url('tenniscourt.jpg')",
    primaryColor: "#a2ff00",
    pointOptions: [1]
  },
  baseball: {
    title: "⚾ Baseball / Softball Arena",
    bg: "url('baseballfield.jpg')",
    primaryColor: "#dfa364",
    pointOptions: [1]
  },
  football: {
    title: "🏈 American Football Arena",
    bg: "url('footballfield.jpg')",
    primaryColor: "#9c27b0",
    pointOptions: [1, 2, 3, 6]
  },
  tabletennis: {
    title: "🏓 Table Tennis Arena",
    bg: "url('tabletennistable.jpg')",
    primaryColor: "#00e5ff",
    pointOptions: [1]
  }
};

function nextPowerOfTwo(n) {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

function getTeamsFromInput() {
  const input = document.getElementById('teamInput').value;
  return input
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function buildBracket(teamArray, shuffle = true) {
  let participants = [...teamArray];
  if (shuffle) {
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }
  }

  const size = nextPowerOfTwo(participants.length);
  while (participants.length < size) {
    participants.push('BYE');
  }

  let firstRound = [];
  for (let i = 0; i < participants.length; i += 2) {
    const t1 = participants[i];
    const t2 = participants[i + 1];
    let isByeMatch = (t1 === 'BYE' || t2 === 'BYE');
    let computedWinner = null;
    
    if (t1 === 'BYE' && t2 !== 'BYE' && t2 !== 'TBD') computedWinner = t2;
    if (t2 === 'BYE' && t1 !== 'BYE' && t1 !== 'TBD') computedWinner = t1;

    firstRound.push({
      teamA: t1,
      teamB: t2,
      scoreA: 0,
      scoreB: 0,
      winner: computedWinner,
      isBye: isByeMatch
    });
  }

  let rounds = [firstRound];

  while (rounds[rounds.length - 1].length > 1) {
    const prevRound = rounds[rounds.length - 1];
    const nextRound = [];
    for (let i = 0; i < prevRound.length; i += 2) {
      nextRound.push({
        teamA: prevRound[i].winner || 'TBD',
        teamB: prevRound[i + 1].winner || 'TBD',
        scoreA: 0,
        scoreB: 0,
        winner: null,
        isBye: false
      });
    }
    rounds.push(nextRound);
  }
  return rounds;
}

function clearDownstream(roundIdx, matchIdx) {
  for (let r = roundIdx + 1; r < tournamentRounds.length; r++) {
    const step = r - roundIdx;
    const parentIdx = Math.floor(matchIdx / Math.pow(2, step));
    if (tournamentRounds[r] && tournamentRounds[r][parentIdx]) {
      const parentMatch = tournamentRounds[r][parentIdx];
      if (matchIdx % 2 === 0) {
        parentMatch.teamA = 'TBD';
      } else {
        parentMatch.teamB = 'TBD';
      }
      parentMatch.winner = null;
      parentMatch.scoreA = 0;
      parentMatch.scoreB = 0;
    }
  }
}

function propagateWinner(roundIdx, matchIdx, winner) {
  if (!winner || winner === 'BYE' || winner === 'TBD') return;
  
  const nextRoundIndex = roundIdx + 1;
  if (nextRoundIndex < tournamentRounds.length) {
    const nextMatchIndex = Math.floor(matchIdx / 2);
    const nextMatch = tournamentRounds[nextRoundIndex][nextMatchIndex];
    
    if (matchIdx % 2 === 0) {
      nextMatch.teamA = winner;
    } else {
      nextMatch.teamB = winner;
    }
    
    if (nextMatch.teamA === 'BYE' && nextMatch.teamB !== 'BYE' && nextMatch.teamB !== 'TBD') {
      nextMatch.winner = nextMatch.teamB;
      propagateWinner(nextRoundIndex, nextMatchIndex, nextMatch.teamB);
    } else if (nextMatch.teamB === 'BYE' && nextMatch.teamA !== 'BYE' && nextMatch.teamA !== 'TBD') {
      nextMatch.winner = nextMatch.teamA;
      propagateWinner(nextRoundIndex, nextMatchIndex, nextMatch.teamA);
    }
  }
}

function generateTournament(shuffle = true) {
  const teams = getTeamsFromInput();
  if (teams.length < 2) {
    const err = document.getElementById('setupError');
    if (err) {
      err.textContent = '❌ Please enter at least 2 teams inside configuration area!';
      err.style.display = 'block';
    }
    return;
  }
  const err = document.getElementById('setupError');
  if (err) err.style.display = 'none';

  const nameVal = document.getElementById('tourneyNameInput').value || 'Intramural Tournament';
  const sportVal = document.getElementById('sportSelect').value;
  
  document.getElementById('displayTourneyName').textContent = nameVal.toUpperCase();
  document.getElementById('displaySport').textContent = sportVal.toUpperCase();

  tournamentRounds = buildBracket(teams, shuffle);
  matchHistory = [];
  activeMatchRef = null;

  document.getElementById('team1Name').textContent = "Select a Match";
  document.getElementById('team2Name').textContent = "Select a Match";
  document.getElementById('score1').textContent = "0";
  document.getElementById('score2').textContent = "0";
  document.getElementById('activeMatchTrackerText').textContent = "No active match selected";

  changeSportTheme();
  renderBracket();
  updateLogAndChampion();

  document.getElementById('setupPanel').style.display = 'none';
  document.getElementById('bracketPanel').style.display = 'block';
}

function getRoundName(totalRounds, idx) {
  if (idx === totalRounds - 1) return "CHAMPIONSHIP";
  if (idx === totalRounds - 2) return "SEMI-FINALS";
  if (idx === totalRounds - 3) return "QUARTERFINALS";
  return `ROUND ${idx + 1}`;
}

function renderBracket() {
  const container = document.getElementById('bracketRoot');
  if (!container || !tournamentRounds.length) return;
  container.innerHTML = '';

  const totalRounds = tournamentRounds.length;

  for (let r = 0; r < totalRounds; r++) {
    const roundCol = document.createElement('div');
    roundCol.className = 'round-col';

    const roundTitle = document.createElement('div');
    roundTitle.className = 'round-title';
    roundTitle.textContent = getRoundName(totalRounds, r);
    roundCol.appendChild(roundTitle);

    const matches = tournamentRounds[r];
    for (let m = 0; m < matches.length; m++) {
      const match = matches[m];
      
      const matchCard = document.createElement('div');
      matchCard.className = 'match-card';
      
      if (activeMatchRef && activeMatchRef.roundIdx === r && activeMatchRef.matchIdx === m) {
        matchCard.classList.add('active-arena-target');
      }

      if (match.isBye) matchCard.classList.add('bye-card');

      const rowA = document.createElement('div');
      rowA.className = 'team-row-bracket';
      if (match.winner && match.winner === match.teamA) rowA.classList.add('winner');
      
      const nameA = document.createElement('span');
      nameA.className = 'team-name';
      nameA.textContent = match.teamA || 'TBD';
      if (match.teamA === 'BYE') nameA.classList.add('bye-team');
      
      const scoreA = document.createElement('span');
      scoreA.className = 'match-card-score';
      scoreA.textContent = (match.teamA !== 'BYE' && match.teamA !== 'TBD') ? match.scoreA : '—';

      rowA.appendChild(nameA);
      rowA.appendChild(scoreA);

      const rowB = document.createElement('div');
      rowB.className = 'team-row-bracket';
      if (match.winner && match.winner === match.teamB) rowB.classList.add('winner');
      
      const nameB = document.createElement('span');
      nameB.className = 'team-name';
      nameB.textContent = match.teamB || 'TBD';
      if (match.teamB === 'BYE') nameB.classList.add('bye-team');
      
      const scoreB = document.createElement('span');
      scoreB.className = 'match-card-score';
      scoreB.textContent = (match.teamB !== 'BYE' && match.teamB !== 'TBD') ? match.scoreB : '—';

      rowB.appendChild(nameB);
      rowB.appendChild(scoreB);

      matchCard.appendChild(rowA);
      matchCard.appendChild(rowB);

      if (!match.isBye && match.teamA !== 'TBD' && match.teamB !== 'TBD') {
        matchCard.style.cursor = 'pointer';
        matchCard.onclick = () => loadMatchIntoController(r, m);
      }

      roundCol.appendChild(matchCard);
    }
    container.appendChild(roundCol);
  }

  setTimeout(drawConnectorLines, 60);
}

function drawConnectorLines() {
  const container = document.getElementById('bracketRoot');
  if (!container) return;

  const existingCanvas = container.querySelector('.line-canvas');
  if (existingCanvas) existingCanvas.remove();

  const canvas = document.createElement('canvas');
  canvas.className = 'line-canvas';
  container.appendChild(canvas);

  canvas.width = container.scrollWidth;
  canvas.height = container.scrollHeight;

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;

  const rounds = document.querySelectorAll('.round-col');
  for (let i = 0; i < rounds.length - 1; i++) {
    const currentRound = rounds[i];
    const nextRound = rounds[i + 1];
    const matchesA = currentRound.querySelectorAll('.match-card');
    const matchesB = nextRound.querySelectorAll('.match-card');

    for (let mi = 0; mi < matchesA.length; mi += 2) {
      if (matchesA[mi] && matchesA[mi + 1] && matchesB[Math.floor(mi / 2)]) {
        const rectTop = matchesA[mi].getBoundingClientRect();
        const rectBottom = matchesA[mi + 1].getBoundingClientRect();
        const rectNext = matchesB[Math.floor(mi / 2)].getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const startX = rectTop.right - containerRect.left;
        const startYTop = (rectTop.top + rectTop.bottom) / 2 - containerRect.top;
        const startYBottom = (rectBottom.top + rectBottom.bottom) / 2 - containerRect.top;
        const endX = rectNext.left - containerRect.left;
        const midY = (startYTop + startYBottom) / 2;
        const midX = (startX + endX) / 2;

        ctx.beginPath();
        ctx.moveTo(startX, startYTop);
        ctx.lineTo(midX, startYTop);
        ctx.lineTo(midX, startYBottom);
        ctx.lineTo(startX, startYBottom);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(endX, midY);
        ctx.stroke();
      }
    }
  }
}

function loadMatchIntoController(roundIdx, matchIdx) {
  const match = tournamentRounds[roundIdx][matchIdx];
  if (!match || match.isBye) return;

  activeMatchRef = { roundIdx, matchIdx };
  
  document.getElementById('team1Name').textContent = match.teamA;
  document.getElementById('team2Name').textContent = match.teamB;
  document.getElementById('score1').textContent = match.scoreA;
  document.getElementById('score2').textContent = match.scoreB;

  const roundLabel = getRoundName(tournamentRounds.length, roundIdx);
  document.getElementById('activeMatchTrackerText').textContent = `🎮 Editing Arena: ${roundLabel} · Match ${matchIdx + 1}`;

  renderBracket();
  changeSportTheme();
}

function changeScore(teamNum, points) {
  if (!activeMatchRef) {
    alert("Please select an active match card from the bracket tree layout below first!");
    return;
  }
  const scoreEl = document.getElementById(teamNum === 1 ? 'score1' : 'score2');
  let currentScore = parseInt(scoreEl.textContent, 10) || 0;
  
  currentScore = Math.max(0, currentScore + points);
  scoreEl.textContent = currentScore;
}

function lockActiveMatchScore() {
  if (!activeMatchRef) {
    alert("No targeted live active match is currently selected inside the console controller!");
    return;
  }

  const { roundIdx, matchIdx } = activeMatchRef;
  const match = tournamentRounds[roundIdx][matchIdx];
  
  const finalScore1 = parseInt(document.getElementById('score1').textContent, 10) || 0;
  const finalScore2 = parseInt(document.getElementById('score2').textContent, 10) || 0;

  if (finalScore1 === finalScore2) {
    alert("Tie scores are invalid. Please declare an outright match winner to proceed propagation paths!");
    return;
  }

  const oldWinner = match.winner;
  match.scoreA = finalScore1;
  match.scoreB = finalScore2;
  
  const computedWinner = finalScore1 > finalScore2 ? match.teamA : match.teamB;
  match.winner = computedWinner;

  if (oldWinner && oldWinner !== computedWinner) {
    clearDownstream(roundIdx, matchIdx);
  }

  propagateWinner(roundIdx, matchIdx, computedWinner);

  const whistle = document.getElementById('whistleSound');
  if (whistle) whistle.play().catch(() => {});

  const crowd = document.getElementById('crowdSound');
  if (crowd) crowd.play().catch(() => {});

  matchHistory.unshift({
    roundName: getRoundName(tournamentRounds.length, roundIdx),
    matchNumber: matchIdx + 1,
    teamA: match.teamA,
    teamB: match.teamB,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    winner: computedWinner,
    time: new Date().toLocaleTimeString()
  });

  renderBracket();
  updateLogAndChampion();
}

function updateLogAndChampion() {
  const logContainer = document.getElementById('resultsLog');
  if (!logContainer) return;

  if (matchHistory.length === 0) {
    logContainer.innerHTML = '<div class="log-placeholder">✨ Match updates and historical metrics will log here real-time.</div>';
  } else {
    logContainer.innerHTML = matchHistory.map(log => `
      <div class="log-entry">
        ⏱️ <strong>${log.roundName} (Match ${log.matchNumber})</strong>: ${escapeHtml(log.teamA)} <span>${log.scoreA}</span> vs <span>${log.scoreB}</span> ${escapeHtml(log.teamB)} 
        → <strong style="color: gold;">${escapeHtml(log.winner)} Wins</strong> [${log.time}]
      </div>
    `).join('');
  }

  const lastRound = tournamentRounds[tournamentRounds.length - 1];
  const championDisplay = document.getElementById('championDisplay');
  
  if (lastRound && lastRound.length === 1 && lastRound[0].winner) {
    const champName = lastRound[0].winner;
    championDisplay.innerHTML = `
      <div class="champion-box">
        <h4>🏆 TOURNAMENT CHAMPION 🏆</h4>
        <div class="champion-name">${escapeHtml(champName)}</div>
      </div>
    `;
  } else {
    championDisplay.innerHTML = '';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function changeSportTheme() {
  const selectedSport = document.getElementById('sportSelect').value;
  const theme = sportThemes[selectedSport];
  
  if (!theme) return;

  document.body.style.background = `${theme.bg} no-repeat center center fixed`;
  document.body.style.backgroundSize = "cover";

  const setupPanel = document.getElementById('setupPanel') || document.querySelector('.setup-panel');
  if (setupPanel) {
    setupPanel.style.borderColor = theme.primaryColor;
    setupPanel.style.boxShadow = `0 20px 50px ${theme.primaryColor}26, 0 0 30px ${theme.primaryColor}33`;
  }

  const scoreboardCard = document.querySelector('.scoreboard-card') || document.querySelector('.active-match-card');
  if (scoreboardCard) {
    scoreboardCard.style.borderColor = theme.primaryColor;
    scoreboardCard.style.boxShadow = `0 0 30px ${theme.primaryColor}33`;
  }

  const t1Mods = document.getElementById('team1Modifiers');
  const t2Mods = document.getElementById('team2Modifiers');
  
  if (t1Mods && t2Mods) {
    updateScoreModifierButtons('team1Modifiers', 1, theme.pointOptions);
    updateScoreModifierButtons('team2Modifiers', 2, theme.pointOptions);
  }
}

function updateScoreModifierButtons(containerId, teamNum, pointOptions) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = ''; 

  pointOptions.forEach(pts => {
    const btn = document.createElement('button');
    btn.className = 'score-mod-btn';
    btn.textContent = `+${pts}`;
    btn.type = 'button';
    btn.onclick = () => changeScore(teamNum, pts);
    container.appendChild(btn);
  });
}

function reshuffleTournament() {
  const teams = getTeamsFromInput();
  if (teams.length < 2) return;
  generateTournament(true);
}

function resetTournament() {
  document.getElementById('setupPanel').style.display = 'block';
  document.getElementById('bracketPanel').style.display = 'none';
  tournamentRounds = [];
  matchHistory = [];
  activeMatchRef = null;
  resetTimer();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = formatTime(remainingSeconds);
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    if (remainingSeconds <= 0) {
      pauseTimer();
      const whistle = document.getElementById('whistleSound');
      if (whistle) whistle.play().catch(() => {});
      return;
    }
    remainingSeconds -= 1;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer() {
  pauseTimer();
  remainingSeconds = 600;
  updateTimerDisplay();
}

function toggleMusic() {
  const bgMusic = document.getElementById('bgMusic');
  if (!bgMusic) return;
  if (bgMusic.paused) {
    bgMusic.play().catch(() => {});
  } else {
    bgMusic.pause();
  }
}

function presetTeams(count) {
  const textarea = document.getElementById('teamInput');
  let names = [];
  for (let i = 1; i <= count; i++) {
    names.push(`Team Alpha ${i}`);
  }
  textarea.value = names.join('\n');
  const span = document.getElementById('teamCountSpan');
  if (span) span.textContent = `(${count})`;
}

document.addEventListener('DOMContentLoaded', () => {
  const p4 = document.getElementById('preset4Btn');
  if (p4) p4.addEventListener('click', () => presetTeams(4));
  
  const p8 = document.getElementById('preset8Btn');
  if (p8) p8.addEventListener('click', () => presetTeams(8));
  
  const p16 = document.getElementById('preset16Btn');
  if (p16) p16.addEventListener('click', () => presetTeams(16));
  
  const gen = document.getElementById('generateBracketBtn');
if (gen) {
    gen.addEventListener('click', () => {
        generateTournament(true);
        
        const container = document.querySelector('.bracket-scroll');
        if (container) container.style.display = 'block'; 
    });
}

  const tInput = document.getElementById('teamInput');
  if (tInput) {
    tInput.addEventListener('input', (e) => {
      const lines = e.target.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const span = document.getElementById('teamCountSpan');
      if (span) span.textContent = `(${lines.length})`;
    });
  }

  window.addEventListener('resize', () => {
    if (tournamentRounds.length > 0) {
      drawConnectorLines();
    }
  });

  updateTimerDisplay();
  changeSportTheme();
});