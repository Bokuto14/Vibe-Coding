// --- STATE MANAGEMENT ---
let generatedTeams = [];
let leagueFixtures = [];
let knockoutRounds = [];
let currentSport = 'pickleball';
let tournamentHistory = [];
let commonPlayer = null;
const maxPlayers = 14;
const initialPlayers = 6;
let currentPlayerCount = 0;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    createInitialPlayerInputs();
    updateInstructions();
    loadTournamentHistory();
    setupEventListeners();
    loadTheme();
    updateTeamNameGeneratorVisibility();
});

function setupEventListeners() {
    DOM.generateButton.addEventListener('click', handleGenerateClick);
    DOM.sportSelector.addEventListener('change', (e) => {
        currentSport = e.target.value;
        updateInstructions();
        updateTeamNameGeneratorVisibility();
    });
    DOM.teamNameTheme.addEventListener('change', handleTeamNameThemeChange);
    DOM.themeSwitch.addEventListener('change', toggleTheme);
    DOM.advanceButton.addEventListener('click', startKnockouts);
    DOM.exportButton.addEventListener('click', exportResults);
    DOM.addPlayerBtn.addEventListener('click', () => addPlayerInput(true));
}

// --- CORE LOGIC ---
function handleGenerateClick() {
    const playerElements = Array.from(DOM.playerInputsContainer.querySelectorAll('.player-input-row'));
    let players = playerElements.map((row, index) => {
        const nameInput = row.querySelector('.player-name-input');
        const name = nameInput.value.trim();
        const rating = parseInt(row.querySelector('.rating-input').value, 10);
        return { name, rating: isNaN(rating) ? 3 : rating, id: `p${Date.now()}${index}` };
    }).filter(p => p.name);

    if (players.length < 2) {
        showError('Please enter at least 2 players.');
        return;
    }
    if (new Set(players.map(p => p.name.toLowerCase())).size !== players.length) {
        showError('Player names must be unique.');
        return;
    }
    startTournament(players);
}

function startTournament(players) {
    resetState(false);
    DOM.generateButton.disabled = true;

    setTimeout(() => {
        const config = sportConfigs[currentSport];
        let availableTeamNames;

        if (currentSport === 'fifa') {
            availableTeamNames = Object.keys(fifaTeamData);
        } else {
            const theme = DOM.teamNameTheme.value;
            if (theme === 'custom') {
                availableTeamNames = DOM.customTeamNamesInput.value.split(',').map(n => n.trim()).filter(Boolean);
            } else {
                availableTeamNames = [...teamNameLists[theme]].sort(() => 0.5 - Math.random());
            }
        }

        const requiredTeams = Math.ceil(players.length / 2);
        if (availableTeamNames.length < requiredTeams) {
            showError(`Not enough team names for ${requiredTeams} teams.`);
            DOM.generateButton.disabled = false;
            return;
        }

        generatedTeams = generateBalancedTeams(players, config);
        generatedTeams.sort((a, b) => a.name.localeCompare(b.name));

        const matchesPerTeamOption = DOM.matchesPerTeam.value;
        let fixtures = (matchesPerTeamOption === 'all')
            ? generateRoundRobinFixtures(generatedTeams)
            : generateLimitedFixtures(generatedTeams, parseInt(matchesPerTeamOption, 10));

        leagueFixtures = scheduleFixturesWithRest(fixtures);

        renderTeams();
        renderAllFixtures();
        updatePointsTable();

        DOM.teamsContainer.style.display = 'grid';
        DOM.fixturesSection.style.display = 'block';
        DOM.pointsTableSection.style.display = 'block';
        DOM.tournamentControls.style.display = 'block';
        DOM.generateButton.disabled = false;
    }, 500);
}

function generateBalancedTeams(players, config) {
    let teams = [];
    commonPlayer = null;
    let sortedPlayers = [...players].sort((a, b) => b.rating - a.rating || Math.random() - 0.5);
    let playersToPair = [...sortedPlayers];

    if (playersToPair.length > 0 && playersToPair.length % 2 !== 0) {
        const medianPlayer = sortedPlayers[Math.floor(sortedPlayers.length / 2)];
        commonPlayer = medianPlayer;
        playersToPair.push({ ...commonPlayer, id: `${commonPlayer.id}_copy` });
        playersToPair.sort((a, b) => b.rating - a.rating);
    }

    const numTeams = Math.floor(playersToPair.length / 2);
    
    while (playersToPair.length > 1) {
        const player1 = playersToPair.shift();
        const player2 = playersToPair.pop();
        teams.push({
            players: [player1, player2],
            colors: {},
            leagueResults: {},
            pointsFor: 0,
            pointsAgainst: 0,
            averageRating: (player1.rating + player2.rating) / 2,
            isDropped: false
        });
    }

    // Name teams after they are formed and balanced
    let teamNames;
    if (currentSport === 'fifa') {
        teamNames = Object.keys(fifaTeamData).sort(() => 0.5 - Math.random());
    } else {
        const theme = DOM.teamNameTheme.value;
        if (theme === 'custom') {
            teamNames = DOM.customTeamNamesInput.value.split(',').map(n => n.trim()).filter(Boolean);
        } else {
            teamNames = [...teamNameLists[theme]].sort(() => 0.5 - Math.random());
        }
    }
    
    teams.forEach((team, index) => {
        team.name = teamNames[index] || `Team ${index + 1}`;
        if(currentSport === 'fifa' && fifaTeamData[team.name]) {
            team.colors = fifaTeamData[team.name];
        }
    });
    
    // Fix self-pairing
    if (commonPlayer) {
        const selfPairedTeamIndex = teams.findIndex(team => 
            team.players[0].id === commonPlayer.id && team.players[1].id === `${commonPlayer.id}_copy` ||
            team.players[1].id === commonPlayer.id && team.players[0].id === `${commonPlayer.id}_copy`
        );

        if (selfPairedTeamIndex !== -1) {
            const swapTargetIndex = teams.findIndex((team, index) => 
                index !== selfPairedTeamIndex && !team.players.some(p => p.name === commonPlayer.name)
            );

            if (swapTargetIndex !== -1) {
                const tempPlayer = teams[selfPairedTeamIndex].players[1];
                teams[selfPairedTeamIndex].players[1] = teams[swapTargetIndex].players[0];
                teams[swapTargetIndex].players[0] = tempPlayer;
            }
        }
    }

    return teams;
}

function recordMatchScore(matchNum, homeScore, awayScore) {
    const match = leagueFixtures.find(m => m.num === matchNum);
    if (!match) return;

    // --- FIX: Clears previous result before applying new one ---
    delete match.home.leagueResults[match.num];
    delete match.away.leagueResults[match.num];

    match.home.pointsFor -= match.homeScore || 0;
    match.home.pointsAgainst -= match.awayScore || 0;
    match.away.pointsFor -= match.awayScore || 0;
    match.away.pointsAgainst -= match.homeScore || 0;

    match.homeScore = homeScore;
    match.awayScore = awayScore;
    
    match.home.pointsFor += homeScore;
    match.home.pointsAgainst += awayScore;
    match.away.pointsFor += awayScore;
    match.away.pointsAgainst += homeScore;

    // --- FIX: Correctly updates each team's win/loss/tie record ---
    if (homeScore > awayScore) {
        match.result = match.home;
        match.home.leagueResults[match.num] = 'win';
        match.away.leagueResults[match.num] = 'loss';
    } else if (awayScore > homeScore) {
        match.result = match.away;
        match.away.leagueResults[match.num] = 'win';
        match.home.leagueResults[match.num] = 'loss';
    } else {
        match.result = 'tie';
        match.home.leagueResults[match.num] = 'tie';
        match.away.leagueResults[match.num] = 'tie';
    }
    
    updatePointsTable();
    renderAllFixtures();
    renderTeams(); // Ensure table and teams update after scoring
}

function generateLimitedFixtures(teams, matchesPerTeam) {
    const allPossibleMatches = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            allPossibleMatches.push({ home: teams[i], away: teams[j], result: null });
        }
    }
    allPossibleMatches.sort(() => 0.5 - Math.random());

    const finalFixtures = [];
    const teamMatchCount = {};
    teams.forEach(t => teamMatchCount[t.name] = 0);

    for (const match of allPossibleMatches) {
        if (teamMatchCount[match.home.name] < matchesPerTeam && teamMatchCount[match.away.name] < matchesPerTeam) {
            finalFixtures.push(match);
            teamMatchCount[match.home.name]++;
            teamMatchCount[match.away.name]++;
        }
    }
    return finalFixtures;
}

function generateRoundRobinFixtures(teams) {
    const allMatches = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            allMatches.push({ home: teams[i], away: teams[j], result: null });
        }
    }
    return allMatches;
}

function scheduleFixturesWithRest(matches) {
    const scheduledMatches = [];
    let availableMatches = [...matches];
    const teamLastPlayed = {};
    generatedTeams.forEach(team => teamLastPlayed[team.name] = -3);

    let matchNumber = 1;
    while (availableMatches.length > 0) {
        availableMatches.sort((a, b) => {
            const aRest = (matchNumber - teamLastPlayed[a.home.name]) + (matchNumber - teamLastPlayed[a.away.name]);
            const bRest = (matchNumber - teamLastPlayed[b.home.name]) + (matchNumber - teamLastPlayed[b.away.name]);
            return bRest - aRest;
        });

        const bestMatch = availableMatches.shift();
        bestMatch.num = matchNumber;
        scheduledMatches.push(bestMatch);
        teamLastPlayed[bestMatch.home.name] = matchNumber;
        teamLastPlayed[bestMatch.away.name] = matchNumber;
        matchNumber++;
    }
    return scheduledMatches;
}

function updatePlayerName(playerId, newName) {
    generatedTeams.forEach(team => {
        team.players.forEach(player => {
            if (player.id === playerId) player.name = newName;
        });
    });
    if (commonPlayer && commonPlayer.id === playerId) commonPlayer.name = newName;
    renderTeams();
    renderAllFixtures();
}

function removeTeam(teamName) {
    openConfirmModal(`This will void all matches for ${teamName} and remove them.`, () => {
        const team = generatedTeams.find(t => t.name === teamName);
        if (team) {
            team.isDropped = true;
            const allFixtures = [...leagueFixtures, ...knockoutRounds.flatMap(r => r.matches || [])];
            allFixtures.forEach(match => {
                if (match && (match.home.name === teamName || match.away.name === teamName)) match.result = 'void';
            });
            renderTeams();
            renderAllFixtures();
            updatePointsTable();
        }
    });
}

function startKnockouts() {
    const standings = updatePointsTable().filter(t => !t.isDropped);
    if (standings.length < 2) {
        showError("Not enough teams to start knockouts.");
        return;
    }
    
    let numToAdvance = standings.length >= 4 ? 4 : 2;
    const advancingTeams = standings.slice(0, numToAdvance);

    const stageName = advancingTeams.length === 2 ? "GRAND FINAL" : "Semi-Finals";
    
    const knockoutMatches = [];
    for(let i = 0; i < advancingTeams.length / 2; i++) {
        knockoutMatches.push({
            home: advancingTeams[i],
            away: advancingTeams[advancingTeams.length - 1 - i],
            num: (leagueFixtures.length || 0) + i + 1,
            result: null
        });
    }

    knockoutRounds = [{ stageName, matches: knockoutMatches }];
    renderKnockoutStage();
    DOM.tournamentControls.style.display = 'none';
    DOM.fixturesSection.style.display = 'none';
}

function advanceKnockoutWinners() {
    const currentRound = knockoutRounds[knockoutRounds.length - 1];
    // Only count matches where result is a team object (not null/undefined)
    const winners = currentRound.matches.map(m => (m.result && typeof m.result === 'object') ? m.result : null).filter(Boolean);

    if (winners.length !== currentRound.matches.length) {
        showError("Please select a winner for every match.");
        return;
    }

    if (winners.length === 1) {
        const champion = winners[0];
        DOM.bracketContainer.innerHTML = '';
        DOM.knockoutControls.innerHTML = '';
        DOM.knockoutStageTitle.innerHTML = `<span class="champion-text">🏆 ${champion.name} are the champions! 🏆</span>`;
        createConfetti();
        DOM.exportSection.style.display = 'block';
        saveTournamentToHistory(champion);
        return;
    }

    const finalMatch = {
        home: winners[0],
        away: winners[1],
        num: currentRound.matches[currentRound.matches.length - 1].num + 1,
        result: null
    };
    knockoutRounds.push({ stageName: 'GRAND FINAL', matches: [finalMatch] });
    renderKnockoutStage();
}

function selectKnockoutResult(matchNum, winner) {
    const currentRound = knockoutRounds[knockoutRounds.length - 1];
    const match = currentRound.matches.find(m => m.num === matchNum);
    if (match) {
        match.result = winner;
        renderBracketView();
    }
}

function applySubstitute(matchNum, subPlayerId, teamName, isLeague) {
    const fixtures = isLeague ? leagueFixtures : knockoutRounds.flat().flatMap(r => r.matches);
    const match = fixtures.find(m => m.num === matchNum);
    if (!match) return;
    
    const subPlayer = generatedTeams.flatMap(t => t.players).find(p => p.id === subPlayerId);
    const teamToSubFor = generatedTeams.find(t => t.name === teamName);

    match.substitution = {
        original: commonPlayer,
        sub: subPlayer,
        team: teamToSubFor
    };

    closeModal('substitute-modal');
    renderAllFixtures();
}
window.applySubstitute = applySubstitute;
window.promptForSubTeam = promptForSubTeam;

function exportResults() {
    const standings = updatePointsTable();
    const config = sportConfigs[currentSport];
    const timestamp = new Date().toLocaleString();
    let exportText = `🏆 ${currentSport.toUpperCase()} TOURNAMENT RESULTS\n📅 ${timestamp}\n\n📊 FINAL STANDINGS:\n====================\n`;
    standings.forEach((team, index) => {
        exportText += `${index + 1}. ${team.name} ${team.isDropped ? '(DNF)' : ''}\n`;
        exportText += `   Points: ${team.points} | W:${team.w} | ${config.allowTies ? `T:${team.t} | ` : ''}L:${team.l}\n`;
        exportText += `   Players: ${team.players.map(p => `${p.name}(${p.rating})`).join(', ')}\n\n`;
    });
    navigator.clipboard.writeText(exportText).then(() => {
        alert('Results copied to clipboard!');
    }).catch(err => {
        console.error("Failed to copy results:", err);
        showError("Could not copy results to clipboard.");
    });
}

function saveTournamentToHistory(champion) {
    const tournamentData = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        sport: currentSport,
        champion: { name: champion.name, players: champion.players },
    };
    tournamentHistory.unshift(tournamentData);
    if (tournamentHistory.length > 5) tournamentHistory.pop();
    localStorage.setItem('tournamentHistory', JSON.stringify(tournamentHistory));
    renderHistory();
}

function loadTournamentHistory() {
    const savedHistory = localStorage.getItem('tournamentHistory');
    if (savedHistory) {
        tournamentHistory = JSON.parse(savedHistory);
        renderHistory();
    }
}