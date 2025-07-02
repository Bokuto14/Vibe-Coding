function openConfirmModal(text, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Are you sure?</h3>
            <p>${text}</p>
            <div class="modal-options">
                <button id="confirm-yes" class="modal-btn danger">Yes</button>
                <button id="confirm-no" class="modal-btn secondary">No</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    document.getElementById('confirm-yes').onclick = () => {
        onConfirm();
        closeModal('confirm-modal');
    };
    document.getElementById('confirm-no').onclick = () => closeModal('confirm-modal');
}

function openEditPlayerModal(playerId, currentName) {
    const modal = document.getElementById('edit-player-modal');
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Edit Player Name</h3>
            <input type="text" id="edit-player-name-input" value="${currentName}">
            <div class="modal-options">
                <button id="save-player-name" class="modal-btn primary">Save</button>
                <button id="cancel-edit" class="modal-btn secondary">Cancel</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    document.getElementById('save-player-name').onclick = () => {
        const newName = document.getElementById('edit-player-name-input').value.trim();
        if (newName) {
            updatePlayerName(playerId, newName);
            closeModal('edit-player-modal');
        }
    };
    document.getElementById('cancel-edit').onclick = () => closeModal('edit-player-modal');
}

function openSubstituteModal(matchNum, isLeague) {
     const modal = document.getElementById('substitute-modal');
     // ... (Your existing substitute modal logic goes here)
     modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function openSubstituteModal(matchNum, isLeague) {
    const fixtures = isLeague ? leagueFixtures : knockoutRounds.flat().flatMap(r => r.matches);
    const match = fixtures.find(m => m.num === matchNum);
    if (!match) return;

    const playersInMatch = [...match.home.players, ...match.away.players].map(p => p.name);
    const allPlayers = generatedTeams.flatMap(t => t.players);
    const eligibleSubs = [...new Map(allPlayers.map(item => [item['name'], item])).values()]
        .filter(p => !playersInMatch.includes(p.name));

    const modal = document.getElementById('substitute-modal');
    let modalContent = `
        <div class="modal-content">
            <h3>Substitute Required!</h3>
            <p>${commonPlayer.name} is on both teams. Choose a substitute:</p>
            <div id="sub-options-list" class="modal-options">`;

    if (eligibleSubs.length === 0) {
        modalContent += `<p>No eligible substitutes found.</p>`;
    } else {
        eligibleSubs.forEach(sub => {
            modalContent += `<button class="modal-btn primary" onclick="promptForSubTeam(${matchNum}, '${sub.id}', ${isLeague})">${sub.name} (${sub.rating})</button>`;
        });
    }

    modalContent += `</div><div class="modal-options" style="margin-top: 20px;"><button class="modal-btn secondary" onclick="closeModal('substitute-modal')">Cancel</button></div></div>`;
    modal.innerHTML = modalContent;
    modal.style.display = 'flex';
}

function promptForSubTeam(matchNum, subPlayerId, isLeague) {
    const fixtures = isLeague ? leagueFixtures : knockoutRounds.flat().flatMap(r => r.matches);
    const match = fixtures.find(m => m.num === matchNum);
    const subPlayer = generatedTeams.flatMap(t => t.players).find(p => p.id === subPlayerId);

    const modalList = document.getElementById('sub-options-list');
    modalList.parentElement.querySelector('h3').textContent = 'Assign Substitute';
    modalList.parentElement.querySelector('p').textContent = `Which team will ${subPlayer.name} play for?`;
    modalList.innerHTML = `
        <button class="modal-btn" onclick="applySubstitute(${matchNum}, '${subPlayerId}', '${match.home.name}', ${isLeague})">${match.home.name}</button>
        <button class="modal-btn" onclick="applySubstitute(${matchNum}, '${subPlayerId}', '${match.away.name}', ${isLeague})">${match.away.name}</button>
    `;
}

function openScoreModal(matchNum, isLeague, isKnockout = false) {
    const fixtures = isLeague ? leagueFixtures : knockoutRounds.flat().flatMap(r => r.matches);
    const match = fixtures.find(m => m.num === matchNum);
    if (!match) return;

    const modal = document.getElementById('edit-player-modal'); // Re-using a modal container
    let modalHTML = `
        <div class="modal-content">
            <h3>Record Score for Match ${match.num}</h3>
            <div class="score-input-container">
                <div class="score-team">
                    <label for="home-score">${match.home.name}</label>
                    <input type="number" id="home-score" min="0" value="${match.homeScore || 0}">
                </div>
                <div class="score-team">
                    <label for="away-score">${match.away.name}</label>
                    <input type="number" id="away-score" min="0" value="${match.awayScore || 0}">
                </div>
            </div>
            <div class="modal-options">
                <button id="save-score-btn" class="modal-btn primary">Save Score</button>`;

    if (sportConfigs[currentSport].allowTies && isLeague) {
        modalHTML += `<button id="record-tie-btn" class="modal-btn secondary">Record Tie</button>`;
    }

    modalHTML += `</div></div>`;
    modal.innerHTML = modalHTML;
    modal.style.display = 'flex';

    document.getElementById('save-score-btn').onclick = () => {
        const homeScore = parseInt(document.getElementById('home-score').value, 10);
        const awayScore = parseInt(document.getElementById('away-score').value, 10);

        if (!isKnockout && homeScore === awayScore && !sportConfigs[currentSport].allowTies) {
            showError(`Ties are not allowed in ${currentSport}. Please enter a valid winner.`);
            return;
        }

        if (isKnockout) {
            if (homeScore === awayScore) {
                showError('Ties are not allowed in playoffs. Please enter a valid winner.');
                return;
            }
            match.homeScore = homeScore;
            match.awayScore = awayScore;
            if (homeScore > awayScore) {
                match.result = match.home;
            } else if (awayScore > homeScore) {
                match.result = match.away;
            } else {
                match.result = null; // No ties in knockout
            }
            renderBracketView();
        } else {
            recordMatchScore(matchNum, homeScore, awayScore, isLeague);
        }
        closeModal('edit-player-modal');
    };

    if (sportConfigs[currentSport].allowTies && isLeague) {
        document.getElementById('record-tie-btn').onclick = () => {
            const score = parseInt(document.getElementById('home-score').value, 10) || 0;
            recordMatchScore(matchNum, score, score, isLeague);
            closeModal('edit-player-modal');
        };
    }
}