import React, { useState, useEffect } from 'react';
import './App.css';

import * as api from './api';

// --- Minimal routing support ---
const Page = {
  LOGIN: 'login',
  REGISTER: 'register',
  DASHBOARD: 'dashboard',
  GAME: 'game',
};

// --- Util ---
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

function useThemeSync() {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

function Navbar({ user, onLogout, theme, toggleTheme }) {
  return (
    <div className="navbar">
      <span className="brand">Tic Tac Toe</span>
      <div className="spacer" />
      {user && (
        <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{user.username}</span>
      )}
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      {user && <button className="btn" onClick={onLogout}>Logout</button>}
    </div>
  );
}

// --- Login/Register ---
function LoginRegister({ mode, onLogin, onSwitch }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isRegister = (mode === Page.REGISTER);

  // PUBLIC_INTERFACE
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) {
        await api.register(username, password);
      }
      await api.login(username, password);
      onLogin();
    } catch (err) {
      setError(String(err.message || 'Failed'));
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <h1 className="title">{isRegister ? 'Sign up' : 'Sign in'}</h1>
      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input required value={username} onChange={e => setUsername(e.target.value)} />
        <label>Password</label>
        <input required type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="btn" disabled={busy}>
          {isRegister ? 'Register' : 'Login'}
        </button>
        <div>
          <span>or </span>
          <span className="link" onClick={onSwitch}>{isRegister ? 'Login' : 'Register'}</span>
        </div>
        {error && <div style={{ color: 'var(--danger)', marginTop: 7 }}>{error}</div>}
      </form>
    </div>
  );
}

// --- Dashboard for Games ---
function Dashboard({ user, onStartGame, onJoinGame, onEnterGame, games, loading, refreshGames }) {
  return (
    <div className="card">
      <h1 className="title">Welcome, {user?.username}!</h1>
      <div className="subtitle">Start a new game, join one, or view your games</div>
      <button className="btn" style={{ marginBottom: 17 }} onClick={onStartGame}>+ Start New Game</button>
      <button className="btn secondary" style={{ marginLeft: 8, marginBottom: 17 }} onClick={refreshGames}>Refresh</button>
      {loading
        ? <div style={{ margin: '18px 0' }}>Loading games...</div>
        : (
          <div className="dashboard-list">
            <div className="dashboard-header" style={{fontSize: '1.04em'}}>
              <div>ID</div>
              <div>Players</div>
              <div>Status</div>
              <div>Action</div>
            </div>
            {games.length === 0 && <div className="dashboard-row">No games found.</div>}
            {games.map(g => (
              <div key={g.id} className="dashboard-row" style={{opacity: g.winner !== null ? .66 : 1}}>
                <div className="dashboard-game-id">#{g.id}</div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 64}}>
                  <span style={{ color: 'var(--primary)' }}>{g.player_x_id !== null ? 'X' : ''}</span>
                  <span style={{ color: 'var(--secondary)'}}> {g.player_o_id !== null ? 'O' : ''}</span>
                </div>
                <div className="dashboard-status">
                  {g.winner !== null ? 'Finished' :
                  g.player_o_id == null ? 'Open' : (g.current_turn === 'X' ? 'X’s turn' : 'O’s turn')}
                </div>
                <div>
                  {g.winner === null && g.player_o_id === null && g.player_x_id !== user.id ? (
                    <button className="btn accent dashboard-join" onClick={() => onJoinGame(g.id)}>Join</button>
                  ) : (
                    <button className="btn dashboard-join" onClick={() => onEnterGame(g.id)}>Enter</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// --- Game Board + State ---
function GameView({ gameId, user, onBack }) {
  const [game, setGame] = useState(null); // GameDetail object
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameState, setGameState] = useState(null); // For latest board/winner
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState('');
  const [movePending, setMovePending] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Periodic polling for real-time effect (2s interval if game not finished)
  useEffect(() => {
    let mounted = true;
    let interval;
    async function fetchAll() {
      setFetching(true);
      setErr('');
      try {
        const [g, m, s] = await Promise.all([
          api.getGameDetail(gameId),
          api.getMoveHistory(gameId),
          api.getGameState(gameId),
        ]);
        if (mounted) {
          setGame(g);
          setMoveHistory(m);
          setGameState(s);
        }
      } catch (e) {
        setErr('Could not load game data');
      }
      setFetching(false);
    }
    fetchAll();
    if (autoRefresh) {
      interval = setInterval(fetchAll, 1750);
    }
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [gameId, autoRefresh]);

  if (fetching && !game) return <div className="game-center"><div>Loading game...</div></div>;
  if (err) return <div className="game-center"><div style={{color:'var(--danger)'}}>{err}</div></div>;
  if (!game) return null;

  const boardArr = buildBoard(moveHistory);

  // Logic to determine if player may move
  const currentTurn = (game.current_turn || '').toUpperCase();
  const myLetter = (user.id === game.player_x_id) ? 'X' : (user.id === game.player_o_id ? 'O' : null);
  const canMove = game.winner === null && currentTurn === myLetter;
  const winningCells = getWinningLine(boardArr);

  // PUBLIC_INTERFACE
  async function handleMove(idx) {
    if (!canMove || boardArr[idx] || movePending) return;
    setMovePending(true);
    setErr('');
    try {
      await api.makeMove(gameId, idx);
      // Board refresh will occur by polling.
    } catch (e) {
      setErr(`Move failed: ${e.message || 'error'}`);
    }
    setMovePending(false);
  }

  return (
    <div className="game-center">
      <div className="game-info">
        <PlayerBox name={game.player_x?.username || 'waiting'} label='Player X'
          active={currentTurn==='X'} winner={game.winnerLetter==='X'} highlight={myLetter==='X'} />
        <div style={{minWidth:32, minHeight:42, fontWeight:700, color:'var(--accent)'}}>vs</div>
        <PlayerBox name={game.player_o?.username || 'waiting'} label='Player O'
          active={currentTurn==='O'} winner={game.winnerLetter==='O'} highlight={myLetter==='O'} />
      </div>
      <TicTacToeBoard
        board={boardArr}
        onCellClick={handleMove}
        winner={game.winner}
        currentTurn={currentTurn}
        canMove={canMove}
        winningCells={winningCells}
        user={user}
      />
      <div className="status-text" style={{marginBottom:13}}>
        {game.winner == null
          ? (canMove
              ? <>Your turn <span style={{fontWeight: 500}}>({myLetter})</span></>
              : <>{currentTurn === myLetter
                ? 'Waiting...'
                : <>Waiting for <b>{currentTurn}</b></>
              }</>
            )
          : (
              <>
                <span>Game Over: </span>
                {typeof game.winner === 'number'
                  ? game.winner === user.id
                    ? <span className="move-history-winner">You win!</span>
                    : <span className="move-history-winner">You lose!</span>
                  : (game.winner === null
                    ? <span>Draw</span>
                    : <span>Win: <b>{game.winner}</b></span>
                  )
                }
              </>
            )
        }
      </div>
      {err && <div style={{color:'var(--danger)',marginBottom:7}}>{err}</div>}
      <div className="move-history">
        <div className="move-history-title">Move History</div>
        {moveHistory.map(mv => (
          <div key={mv.id} className="move-history-entry">
            <span className={mv.player_id === game.player_x_id ? "move-history-player-x" : "move-history-player-o"}>
              {mv.player_id === game.player_x_id ? "X" : "O"}
            </span>
            <span> moved to [{Math.floor(mv.position/3)+1},{(mv.position%3)+1}]</span>
            <span style={{ color: '#999', fontSize: '0.86em', marginLeft: 7 }}>
              #{mv.move_number}
            </span>
          </div>
        ))}
        {moveHistory.length === 0 && <span>No moves yet.</span>}
      </div>
      <div style={{ marginTop: 24 }}>
        <button className="btn secondary" onClick={onBack}>Back to dashboard</button>
        <button className="btn" style={{marginLeft:9}}
          onClick={()=>setAutoRefresh(r => !r)}>{autoRefresh ? "Pause updates" : "Auto-Refresh"}</button>
      </div>
    </div>
  );
}

function buildBoard(moves) {
  // Returns board array of 9: 'X', 'O', or ''
  const board = Array(9).fill('');
  for (let m of moves) {
    board[m.position] = (board[m.position] ? board[m.position] : (m.player_id && m.player_id === m.game?.player_x_id ? 'X' : 'O')) || (m.move_number % 2 === 1 ? 'X' : 'O');
    // Prefer the move as written (FastAPI has move.player_id)
    if (m.move_number === 1) board[m.position] = 'X';
    if (m.move_number === 2 && !board[4]) board[4] = 'O';
    // Defensive for weird edge cases
  }
  return board;
}

function getWinningLine(board) {
  // Return winning cells indices if any, else []
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (let line of wins) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c])
      return line;
  }
  return [];
}

function PlayerBox({ name, label, active, winner, highlight }) {
  return (
    <div className={`game-player${active ? ' active' : ''}${winner ? ' winner' : ''}`} style={{
      border: highlight ? '2.5px solid var(--accent)' : undefined,
      opacity: name==='waiting' ? .63 : 1,
    }}>
      <span className="label">{label}</span>
      <span className="name">{name}</span>
    </div>
  );
}

function TicTacToeBoard({ board, onCellClick, winner, currentTurn, canMove, winningCells, user }) {
  return (
    <div className="tictactoe-board">
      {board.map((val, idx) => {
        let classList = "tictactoe-cell";
        if (!val) classList += " empty";
        if (winningCells && winningCells.includes(idx)) classList += " winner";
        if (!canMove || val || winner !== null) classList += " disabled";
        return (
          <div
            className={classList}
            key={idx}
            onClick={() => (canMove && !val && winner == null) ? onCellClick(idx) : null}
            aria-label={`Cell ${idx + 1}, value ${val || "empty"}`}
            tabIndex={0}
          >
            {val}
          </div>
        );
      })}
    </div>
  );
}

// PUBLIC_INTERFACE -- MAIN APP
function App() {
  const [theme, setTheme] = useThemeSync();
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(Page.LOGIN);
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [gameId, setGameId] = useState(null);

  // On first load, try to fetch session (logged-in)
  useEffect(() => {
    async function check() {
      const u = await api.getMe();
      if (u) {
        setUser(u);
        setPage(Page.DASHBOARD);
      }
    }
    check();
    // eslint-disable-next-line
  }, []);

  // For dashboard: fetch games list
  async function fetchGames() {
    setLoadingGames(true);
    try {
      const gs = await api.listGames({});
      setGames(gs);
    } catch {
      setGames([]);
    }
    setLoadingGames(false);
  }
  useEffect(() => {
    if (page === Page.DASHBOARD && user) fetchGames();
    // eslint-disable-next-line
  }, [page, user]);

  // Session management
  async function handleLogout() {
    await api.logout();
    setUser(null);
    setPage(Page.LOGIN);
  }
  async function handleLoginSuccess() {
    const u = await api.getMe();
    setUser(u);
    setPage(Page.DASHBOARD);
  }

  // Dashboard actions
  async function handleStartGame() {
    const g = await api.startGame();
    setGameId(g.id);
    setPage(Page.GAME);
  }
  async function handleJoinGame(game_id) {
    await api.joinGame(game_id);
    setGameId(game_id);
    setPage(Page.GAME);
  }
  async function handleEnterGame(game_id) {
    setGameId(game_id);
    setPage(Page.GAME);
  }
  function handleBackToDashboard() {
    setGameId(null);
    setPage(Page.DASHBOARD);
  }

  // Simple page routing
  let body;
  if (!user && (page === Page.LOGIN || page === Page.REGISTER)) {
    body = <LoginRegister
      mode={page}
      onLogin={handleLoginSuccess}
      onSwitch={() => setPage(page === Page.LOGIN ? Page.REGISTER : Page.LOGIN)}
    />;
  } else if (user && page === Page.DASHBOARD) {
    body = <Dashboard
      user={user}
      onStartGame={handleStartGame}
      onJoinGame={handleJoinGame}
      onEnterGame={handleEnterGame}
      games={games}
      loading={loadingGames}
      refreshGames={fetchGames}
    />;
  } else if (user && page === Page.GAME && gameId) {
    body = <GameView
      gameId={gameId}
      user={user}
      onBack={handleBackToDashboard}
    />;
  }

  return (
    <div className="App">
      <Navbar user={user} onLogout={handleLogout} theme={theme} toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
      <main>
        {body}
      </main>
    </div>
  );
}

export default App;
