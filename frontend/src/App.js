import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

// 配置 axios 拦截器，自动在请求头中添加 Token
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false); // 初始不加载，登录后加载
  const [error, setError] = useState(null);
  
  // 用户状态
  const [user, setUser] = useState(null); // null 表示未登录
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // 是否在注册页面

  // 页面视图状态: 'home' | 'profile'
  const [view, setView] = useState('home');
  const [myBooks, setMyBooks] = useState([]);

  // 检查本地是否有 Token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedUsername = localStorage.getItem('username');
    if (token && savedUsername) {
      setUser(savedUsername);
      fetchBooks();
    }
  }, []);

  const fetchBooks = () => {
    setLoading(true);
    axios.get('http://127.0.0.1:8000/api/books/')
      .then(response => {
        setBooks(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setError("无法连接到服务器或认证失效。");
        setLoading(false);
      });
  };

  const fetchMyBooks = () => {
    setLoading(true);
    axios.get('http://127.0.0.1:8000/api/books/my_borrowed_books/')
      .then(response => {
        setMyBooks(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching my books:", err);
        setLoading(false);
      });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    axios.post('http://127.0.0.1:8000/api/token/', {
      username: username,
      password: password
    })
    .then(response => {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      localStorage.setItem('username', username);
      setUser(username);
      setError(null);
      fetchBooks();
    })
    .catch(err => {
      console.error("Login error:", err);
      setError("登录失败，请检查用户名和密码。");
    });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    axios.post('http://127.0.0.1:8000/api/register/', {
      username: username,
      password: password,
      email: email
    })
    .then(response => {
      alert("注册成功！请登录。");
      setIsRegistering(false);
      setError(null);
    })
    .catch(err => {
      console.error("Register error:", err);
      setError("注册失败：" + JSON.stringify(err.response?.data));
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    setUser(null);
    setBooks([]);
    setMyBooks([]);
    setView('home');
    setUsername('');
    setPassword('');
  };

  // 处理借阅操作
  const handleBorrow = (bookId, bookTitle) => {
    axios.post(`http://127.0.0.1:8000/api/books/${bookId}/borrow/`)
      .then(response => {
        // 借阅成功，更新本地状态中的库存数量和用户状态
        const updatedBooks = books.map(book => {
          if (book.id === bookId) {
            return { 
              ...book, 
              quantity: response.data.quantity,
              user_status: response.data.user_status 
            };
          }
          return book;
        });
        setBooks(updatedBooks);
        alert(`成功！您已借阅《${bookTitle}》`);
      })
      .catch(err => {
        console.error("Borrow error:", err);
        alert("借阅失败：" + (err.response?.data?.message || "未知错误"));
      });
  };

  // 处理归还操作
  const handleReturn = (bookId, bookTitle) => {
    axios.post(`http://127.0.0.1:8000/api/books/${bookId}/return_book/`)
      .then(response => {
        // 归还成功，更新本地状态
        const updatedBooks = books.map(book => {
          if (book.id === bookId) {
            return { 
              ...book, 
              quantity: response.data.quantity,
              user_status: response.data.user_status 
            };
          }
          return book;
        });
        setBooks(updatedBooks);

        // 如果在个人主页，移除已归还的书籍
        if (view === 'profile') {
          setMyBooks(prev => prev.filter(b => b.id !== bookId));
        }

        alert(`成功！您已归还《${bookTitle}》`);
      })
      .catch(err => {
        console.error("Return error:", err);
        alert("归还失败：" + (err.response?.data?.message || "未知错误"));
      });
  };

  // 导航函数
  const navigateToProfile = () => {
    setView('profile');
    fetchMyBooks();
  };

  const navigateToHome = () => {
    setView('home');
    fetchBooks();
  };

  // 根据状态渲染按钮
  const renderButton = (book) => {
    if (book.user_status === 'BORROWED') {
      return (
        <button 
          className="btn btn-primary w-100" 
          onClick={() => handleReturn(book.id, book.title)}
        >
          归还
        </button>
      );
    } else if (book.user_status === 'NO_STOCK' || book.quantity <= 0) {
      return (
        <button className="btn btn-secondary w-100" disabled>
          暂无库存
        </button>
      );
    } else {
      return (
        <button 
          className="btn btn-outline-success w-100"
          onClick={() => handleBorrow(book.id, book.title)}
        >
          借阅
        </button>
      );
    }
  };

  // 如果未登录，显示登录/注册表单
  if (!user) {
    return (
      <div className="container mt-5" style={{ maxWidth: '400px' }}>
        <h2 className="text-center mb-4">{isRegistering ? '注册新用户' : '用户登录'}</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          <div className="mb-3">
            <label className="form-label">用户名</label>
            <input 
              type="text" 
              className="form-control" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </div>
          {isRegistering && (
            <div className="mb-3">
              <label className="form-label">邮箱 (可选)</label>
              <input 
                type="email" 
                className="form-control" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">密码</label>
            <input 
              type="password" 
              className="form-control" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">
            {isRegistering ? '注册' : '登录'}
          </button>
        </form>
        
        <div className="mt-3 text-center">
          <button 
            className="btn btn-link" 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
          >
            {isRegistering ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 style={{cursor: 'pointer'}} onClick={navigateToHome}>📚 图书馆借书系统</h1>
        <div>
          <span className="me-3">
            欢迎, <button className="btn btn-link text-decoration-none fw-bold" onClick={navigateToProfile}>{user}</button>
          </span>
          <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>退出登录</button>
        </div>
      </div>
      
      {loading && <div className="text-center">加载中...</div>}
      
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && view === 'home' && (
        <div className="row">
          {books.map(book => (
            <div key={book.id} className="col-md-4 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">{book.title}</h5>
                  <h6 className="card-subtitle mb-2 text-muted">{book.authors.map(a => a.name).join(', ')}</h6>
                  <p className="card-text text-truncate">{book.summary}</p>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="badge bg-primary">{book.categories.map(c => c.name).join(', ')}</span>
                    <small className="text-muted">库存: {book.quantity}</small>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-top-0">
                  {renderButton(book)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && view === 'profile' && (
        <div>
          <h3 className="mb-4">我的借阅</h3>
          {myBooks.length === 0 ? (
            <div className="alert alert-info">您当前没有借阅任何书籍。</div>
          ) : (
            <div className="row">
              {myBooks.map(book => (
                <div key={book.id} className="col-md-4 mb-4">
                  <div className="card h-100 shadow-sm border-primary">
                    <div className="card-body">
                      <h5 className="card-title">{book.title}</h5>
                      <h6 className="card-subtitle mb-2 text-muted">{book.authors.map(a => a.name).join(', ')}</h6>
                      <p className="card-text text-truncate">{book.summary}</p>
                    </div>
                    <div className="card-footer bg-transparent border-top-0">
                      <button 
                        className="btn btn-primary w-100" 
                        onClick={() => handleReturn(book.id, book.title)}
                      >
                        归还
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-secondary mt-3" onClick={navigateToHome}>返回首页</button>
        </div>
      )}
    </div>
  );
}

export default App;
