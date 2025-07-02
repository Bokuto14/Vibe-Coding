const sportConfigs = {
    fifa: {
        points: { win: 3, tie: 1, loss: 0 },
        allowTies: true,
        useThemedTeams: true,
        instructions: `
            <strong>Tournament Rules:</strong>
            <ul>
                <li><strong>Player Ratings:</strong> Rate each player 1-5 for skill. Teams are balanced by average rating.</li>
                <li><strong>Odd Player Count:</strong> If there's an odd number of players, the player with the median skill rating will be assigned to two different teams to ensure everyone can play.</li>
                <li><strong>Smart Scheduling:</strong> Matches are scheduled to give teams rest.</li>
                <li><strong>Team Management:</strong> Remove or edit teams mid-tournament.</li>
                <li><strong>Export Results:</strong> Copy final standings to share.</li>
            </ul>`
    },
    pickleball: {
        points: { win: 1, loss: 0 },
        allowTies: false,
        useThemedTeams: false,
        instructions: `
            <strong>Tournament Rules:</strong>
            <ul>
                <li><strong>Player Ratings:</strong> Rate each player 1-5 for skill. Teams are balanced by average rating.</li>
                <li><strong>Odd Player Count:</strong> If there's an odd number of players, the player with the median skill rating will be assigned to two different teams to ensure everyone can play.</li>
                <li><strong>Smart Scheduling:</strong> Matches are scheduled to give teams rest.</li>
                <li><strong>Team Management:</strong> Remove or edit teams mid-tournament.</li>
                <li><strong>Export Results:</strong> Copy final standings to share.</li>
            </ul>`
    }
};

const teamNameLists = {
    mythological: [
        'Titans', 'Dragons', 'Hydras', 'Gorgons', 'Phoenixes', 'Griffins',
        'Centaurs', 'Chimeras', 'Kraken', 'Cyclops', 'Minotaurs', 'Harpies'
    ],
    cosmic: [
        'Supernovas', 'Quasars', 'Nebulas', 'Pulsars', 'Black Holes', 'Galaxies',
        'Comets', 'Asteroids', 'Meteors', 'Stardust', 'Event Horizons', 'Cosmic Rays'
    ],
    literary: [
        'Hobbits', 'Wizards', 'Mockingbirds', 'Gatsbys', 'Darcys', 'Moriartys',
        'Veronas', 'Whales', 'Pilgrims', 'Triffids', 'Jedi', 'Sith'
    ],
    scientific: [
        'Einsteins', 'Curies', 'Newtons', 'Galileos', 'Darwins', 'Teslas',
        'Faradays', 'Hawkings', 'Mendels', 'Bohrs', 'Pascals', 'Voltas'
    ]
};

// DELETE the old teamColors object and REPLACE it with this:
const fifaTeamData = {
    'Real Madrid': { b: 'white', c: '#5a2d81' },
    'FC Barcelona': { b: 'linear-gradient(135deg, #004d98 50%, #a50044 50%)', c: 'white' },
    'Manchester City': { b: '#6cabdd', c: '#00285e' },
    'Manchester United': { b: '#da291c', c: 'white' },
    'Liverpool': { b: '#c8102e', c: 'white' },
    'Arsenal': { b: '#ef0107', c: 'white' },
    'Chelsea': { b: '#034694', c: 'white' },
    'Bayern Munich': { b: '#dc052d', c: 'white' },
    'Borussia Dortmund': { b: '#fee100', c: 'black' },
    'Juventus': { b: 'linear-gradient(135deg, #777 50%, black 50%)', c: 'white' },
    'Inter Milan': { b: 'linear-gradient(135deg, #0068c3 50%, black 50%)', c: 'white' },
    'AC Milan': { b: 'linear-gradient(135deg, #fb090b 50%, black 50%)', c: 'white' },
    'Paris Saint-Germain': { b: '#004171', c: 'white' },
    'Argentina': { b: 'linear-gradient(180deg, #75aadb 33%, white 33%, white 66%, #75aadb 66%)', c: 'black' },
    'Brazil': { b: '#fede00', c: '#009b3a' },
    'France': { b: '#002395', c: 'white' },
};