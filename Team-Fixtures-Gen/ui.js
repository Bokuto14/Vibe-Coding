const DOM = {
    playerInputsContainer: document.querySelector('.player-inputs'),
    generateButton: document.getElementById('generate-button'),
    errorMessage: document.getElementById('error-message'),
    teamsContainer: document.getElementById('teams-container'),
    pointsTableSection: document.getElementById('points-table-section'),
    pointsTableContainer: document.getElementById('points-table-container'),
    fixturesSection: document.getElementById('fixtures-section'),
    fixturesGrid: document.getElementById('fixtures-grid'),
    tournamentControls: document.getElementById('tournament-controls'),
    advanceButton: document.getElementById('advance-to-knockouts-button'),
    knockoutSection: document.getElementById('knockout-section'),
    knockoutStageTitle: document.getElementById('knockout-stage-title'),
    bracketContainer: document.getElementById('bracket-container'),
    knockoutControls: document.getElementById('knockout-controls'),
    sportSelector: document.getElementById('sport-selector'),
    suggestionBox: document.getElementById('suggestion-box'),
    matchesPerTeam: document.getElementById('matches-per-team'),
    teamNameTheme: document.getElementById('team-name-theme'),
    customTeamNamesContainer: document.getElementById('custom-team-names-container'),
    customTeamNamesInput: document.getElementById('custom-team-names-input'),
    exportSection: document.getElementById('export-section'),
    exportButton: document.getElementById('export-results-btn'),
    historySection: document.getElementById('history-section'),
    historyContainer: document.getElementById('history-container'),
    addPlayerBtn: document.getElementById('add-player-btn'),
    themeSwitch: document.getElementById('theme-switch'),
};

function createInitialPlayerInputs() {
    DOM.playerInputsContainer.innerHTML = '';
    currentPlayerCount = 0;
    for (let i = 0; i < initialPlayers; i++) {
        addPlayerInput(false);
    }
}

function addPlayerInput(animate = true) {
    if (currentPlayerCount >= maxPlayers) {
        showError(`Maximum ${maxPlayers} players allowed.`);
        return;
    }
    const row = document.createElement('div');
    row.className = 'player-input-row';
    if (animate) row.style.animation = 'fadeInScale 0.5s ease-out';
    row.innerHTML = `
        <input class="player-name-input" placeholder="Player ${currentPlayerCount + 1}">
        <input type="number" class="rating-input" min="1" max="5" value="3">
        <button class="remove-player-btn" title="Remove player">×</button>
    `;
    row.querySelector('.remove-player-btn').onclick = () => removePlayerInput(row);
    DOM.playerInputsContainer.appendChild(row);
    currentPlayerCount++;
    updateAddPlayerButton();
}

function removePlayerInput(row) {
    row.style.animation = 'fadeOutScale 0.3s ease-out';
    setTimeout(() => {
        row.remove();
        currentPlayerCount--;
        updatePlayerPlaceholders();
        updateAddPlayerButton();
    }, 300);
}

function updatePlayerPlaceholders() {
    const rows = DOM.playerInputsContainer.querySelectorAll('.player-input-row');
    rows.forEach((row, index) => {
        const nameInput = row.querySelector('.player-name-input');
        if (!nameInput.value) {
            nameInput.placeholder = `Player ${index + 1}`;
        }
    });
}

function updateAddPlayerButton() {
    DOM.addPlayerBtn.disabled = currentPlayerCount >= maxPlayers;
    const buttonText = currentPlayerCount >= maxPlayers ? `Max Players (${maxPlayers})` : `Add Player (${currentPlayerCount}/${maxPlayers})`;
    DOM.addPlayerBtn.textContent = buttonText;
}

function renderTeams() {
    DOM.teamsContainer.innerHTML = generatedTeams.map((team, index) => {
        const dnfClass = team.isDropped ? 'dnf-team' : '';
        const dnfBadge = team.isDropped ? '<span class="dnf-badge">DNF</span>' : '';
        const playerList = team.players.map(p => {
            const isCommon = commonPlayer && p.name === commonPlayer.name;
            return `
                <li class="player-item ${isCommon ? 'common-player' : ''}">
                    <span class="player-name-rating">${p.name} (${p.rating})</span>
                    <button class="edit-player-btn" onclick="openEditPlayerModal('${p.id}', '${p.name}')" title="Edit Player">✏️</button>
                </li>`;
        }).join('');
        const teamColorStyle = team.colors.b ? `background: ${team.colors.b}; color: ${team.colors.c}; border: ${team.colors.bo || 'none'}` : '';

        return `
            <div class="team-card ${dnfClass}" style="--delay: ${index * 0.1}s; ${teamColorStyle}">
                <h3>${team.name} ${dnfBadge}</h3>
                <div class="team-average">Avg Rating: ${team.averageRating.toFixed(1)}</div>
                <ul class="player-list">${playerList}</ul>
                ${!team.isDropped ? `<button class="remove-team-btn" onclick="removeTeam('${team.name}')">Remove Team</button>` : ''}
            </div>`;
    }).join('');
}

function renderAllFixtures() {
    renderFixtures(DOM.fixturesGrid, leagueFixtures, true);
}

function renderFixtures(gridEl, fixtures, isLeague) {
    gridEl.innerHTML = '';
    if (!fixtures) return;
    fixtures.forEach((match, index) => {
        if (!match) return;
        const card = document.createElement('div');
        card.className = 'match-card';
        card.style.animationDelay = `${index * 0.05}s`;

        const isConflictMatch = commonPlayer && 
            match.home.players.some(p => p.name === commonPlayer.name) && 
            match.away.players.some(p => p.name === commonPlayer.name);
        
        const needsSub = isConflictMatch && !match.substitution;

        if (needsSub) {
            card.classList.add('needs-sub');
            card.onclick = () => openSubstituteModal(match.num, isLeague);
        } else {
            card.onclick = () => openScoreModal(match.num, isLeague);
        }

        if (match.result === 'void') {
            card.innerHTML = `<div class="match-number">Match ${match.num} - VOID</div>`;
            card.style.opacity = '0.5';
            gridEl.appendChild(card);
            return;
        }

        card.innerHTML = `<div class="match-number">Match ${match.num}</div>`;
        if (needsSub) {
            card.innerHTML += `<div class="status-message" style="background: #fffbeb; color: #b45309; font-size: 0.8rem; padding: 5px; text-align: center;">Substitution Required!</div>`;
        }
        
        const matchTeams = document.createElement('div');
        matchTeams.className = 'match-teams';

        const homeEl = createTeamElement(match, match.home, isLeague, needsSub);
        const awayEl = createTeamElement(match, match.away, isLeague, needsSub);
        
        matchTeams.appendChild(homeEl);
        // --- FIX: Shows score in the middle and highlights it ---
        const scoreBadge = document.createElement('div');
        scoreBadge.className = 'vs-badge';
        if (typeof match.homeScore === 'number') {
            scoreBadge.textContent = `${match.homeScore} : ${match.awayScore}`;
            scoreBadge.classList.add('played');
        } else {
            scoreBadge.textContent = 'VS';
        }
        matchTeams.appendChild(scoreBadge);
        matchTeams.appendChild(awayEl);
        card.appendChild(matchTeams);
        gridEl.appendChild(card);
    });
}

function createTeamElement(match, team, isLeague, isDisabled = false) {
    const el = document.createElement('div');
    el.className = 'team-selectable';
    if (isDisabled) el.classList.add('disabled');

    // Highlight winner/tie
    if (match.result && match.result !== 'tie' && match.result.name === team.name) {
        el.classList.add('winner');
    }
    if (match.result === 'tie') {
        el.classList.add('tie');
    }

    let playersText;
    if (match.substitution && match.substitution.team.name === team.name) {
        const otherPlayer = team.players.find(p => p.name !== commonPlayer.name);
        playersText = `${otherPlayer.name} & ${match.substitution.sub.name} (Sub)`;
    } else {
        playersText = team.players.map(p => p.name).join(' & ');
    }

    el.innerHTML = `<div>${team.name}</div><div class="match-players" style="font-size: 12px; opacity: 0.8;">${playersText}</div>`;
    return el;
}

function updatePointsTable() {
    const config = sportConfigs[currentSport];
    generatedTeams.forEach(team => {
        let points = 0, w = 0, t = 0, l = 0;
        if (!team.isDropped) {
             Object.values(team.leagueResults || {}).forEach(res => {
                if (res === 'win') { points += config.points.win; w++; }
                else if (res === 'tie') { points += config.points.tie; t++; }
                else if (res === 'loss') { l++; }
            });
        }
        team.points = points; team.w = w; team.t = t; team.l = l;
    });

    const sorted = [...generatedTeams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;

        const tiebreakers = [ document.getElementById('tiebreaker-1').value, document.getElementById('tiebreaker-2').value ];
        for (const tiebreaker of tiebreakers) {
            let comparison = 0;
            if (tiebreaker === 'headToHead') {
                const match = leagueFixtures.find(m => (m.home.name === a.name && m.away.name === b.name) || (m.home.name === b.name && m.away.name === a.name));
                if (match && match.result && match.result !== 'tie') {
                    if (match.result.name === a.name) comparison = -1;
                    if (match.result.name === b.name) comparison = 1;
                }
            } else if (tiebreaker === 'scoreDiff') {
                const diffA = a.pointsFor - a.pointsAgainst;
                const diffB = b.pointsFor - b.pointsAgainst;
                comparison = diffB - diffA;
            } else if (tiebreaker === 'scoreFor') {
                comparison = b.pointsFor - a.pointsFor;
            }
            if (comparison !== 0) return comparison;
        }
        return a.name.localeCompare(b.name);
    });

    DOM.pointsTableContainer.innerHTML = `
        <table class="points-table">
            <thead><tr><th>#</th><th>Team</th><th>Pts</th><th>W</th>${config.allowTies ? '<th>T</th>' : ''}<th>L</th><th>+/-</th><th>PF</th></tr></thead>
            <tbody>
                ${sorted.map((t, index) => `
                    <tr class="${t.isDropped ? 'dnf-team' : ''}">
                        <td>${t.isDropped ? '-' : index + 1}</td>
                        <td>${t.name}${t.isDropped ? ' <span class="dnf-badge">DNF</span>' : ''}</td>
                        <td>${t.points}</td><td>${t.w}</td>
                        ${config.allowTies ? `<td>${t.t}</td>` : ''}
                        <td>${t.l}</td><td>${(t.pointsFor - t.pointsAgainst)}</td><td>${t.pointsFor}</td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
    return sorted;
}

function renderKnockoutStage() {
    const currentRound = knockoutRounds[knockoutRounds.length - 1];
    if (!currentRound) return;

    DOM.knockoutSection.style.display = 'block';
    DOM.knockoutStageTitle.textContent = "KNOCKOUT STAGE";
    
    renderBracketView();

    DOM.knockoutControls.innerHTML = '';
    const advanceBtn = document.createElement('button');
    advanceBtn.textContent = 'Advance Winners';
    if (knockoutRounds[knockoutRounds.length - 1]?.matches.length === 1) {
        advanceBtn.textContent = 'Crown Champion';
    }
    advanceBtn.onclick = advanceKnockoutWinners;
    DOM.knockoutControls.appendChild(advanceBtn);
}

function renderBracketView() {
    DOM.bracketContainer.innerHTML = '';
    knockoutRounds.forEach(round => {
        const roundEl = document.createElement('div');
        roundEl.className = 'bracket-round';
        
        const titleEl = document.createElement('div');
        titleEl.className = 'bracket-round-title';
        titleEl.textContent = round.stageName;
        roundEl.appendChild(titleEl);

        round.matches.forEach(match => {
            const matchEl = document.createElement('div');
            matchEl.className = 'bracket-match';
            
            const homeTeamEl = document.createElement('div');
            homeTeamEl.className = 'bracket-team';
            homeTeamEl.textContent = match.home.name;
            homeTeamEl.onclick = () => openScoreModal(match.num, false, true);

            const awayTeamEl = document.createElement('div');
            awayTeamEl.className = 'bracket-team';
            awayTeamEl.textContent = match.away.name;
            awayTeamEl.onclick = () => openScoreModal(match.num, false, true);

            if (match.result) {
                if (match.result.name === match.home.name) homeTeamEl.classList.add('winner');
                if (match.result.name === match.away.name) awayTeamEl.classList.add('winner');
            }

            matchEl.appendChild(homeTeamEl);
            matchEl.appendChild(awayTeamEl);
            roundEl.appendChild(matchEl);
        });
        DOM.bracketContainer.appendChild(roundEl);
    });
}

function renderHistory() {
    if (!tournamentHistory || tournamentHistory.length === 0) {
        DOM.historySection.style.display = 'none';
        return;
    }
    DOM.historySection.style.display = 'block';
    DOM.historyContainer.innerHTML = tournamentHistory.map(t => {
        if (!t || !t.champion) return '';
        return `
            <div class="history-item">
                <div class="history-header">🏆 ${t.sport.toUpperCase()} - ${t.timestamp}</div>
                <div><strong>Champion:</strong> ${t.champion.name}</div>
            </div>`;
    }).join('');
}

function createConfetti() {
    const confettiContainer = document.body;
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `position: fixed; top: -10px; left: ${Math.random() * 100}vw; width: ${Math.random() * 8 + 4}px; height: ${Math.random() * 8 + 4}px; background-color: hsl(${Math.random() * 360}, 100%, 50%); opacity: 0; animation: confetti-fall ${Math.random() * 4 + 3}s linear ${Math.random() * 2}s; z-index: 9999;`;
        confettiContainer.appendChild(confetti);
    }
}

document.head.insertAdjacentHTML('beforeend', `<style>
@keyframes confetti-fall {
    0% { transform: translateY(0) rotate(0); opacity: 1; }
    100% { transform: translateY(100vh) rotate(${Math.random() * 720}deg); opacity: 0; }
}
</style>`);


function showError(message) {
    if (message) {
        DOM.errorMessage.textContent = message;
        DOM.errorMessage.style.display = 'block';
    } else {
        DOM.errorMessage.style.display = 'none';
    }
    setTimeout(() => {
        if(DOM.errorMessage.textContent === message) {
            DOM.errorMessage.style.display = 'none';
        }
    }, 5000);
}

function resetState(resetInputs = true) {
    showError('');
    [DOM.teamsContainer, DOM.pointsTableSection, DOM.fixturesSection, DOM.tournamentControls, DOM.knockoutSection, DOM.exportSection].forEach(el => el.style.display = 'none');
    DOM.knockoutStageTitle.classList.remove('champion-announcement');
    if (resetInputs) createInitialPlayerInputs();
}

function updateInstructions() {
    DOM.suggestionBox.innerHTML = sportConfigs[currentSport].instructions;
}

function handleTeamNameThemeChange() {
    DOM.customTeamNamesContainer.style.display = (DOM.teamNameTheme.value === 'custom') ? 'flex' : 'none';
}

function updateTeamNameGeneratorVisibility() {
    const themeGroup = DOM.teamNameTheme.closest('.setting-group');
    const customGroup = DOM.customTeamNamesContainer;

    if (DOM.sportSelector.value === 'fifa') {
        themeGroup.style.display = 'none';
        customGroup.style.display = 'none';
    } else {
        themeGroup.style.display = 'flex';
        handleTeamNameThemeChange(); 
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

function loadTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        DOM.themeSwitch.checked = true;
    }
}