import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

  // 页面视图状态: 'home' | 'profile' | 'detail'
  const [view, setView] = useState('home');
  const [myBooks, setMyBooks] = useState([]);
  const [borrowHistory, setBorrowHistory] = useState([]);
  const [historyNextPage, setHistoryNextPage] = useState(null);
  const [historyPrevPage, setHistoryPrevPage] = useState(null);
  const [profileTab, setProfileTab] = useState('current'); // 'current' | 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);

  // 检查本地是否有 Token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedUsername = localStorage.getItem('username');
    if (token && savedUsername) {
      setUser(savedUsername);
      fetchBooks();
    }
  }, []);

  const fetchBooks = (url) => {
    setLoading(true);
    
    // 如果没有提供 URL，则根据当前的 searchQuery 构建默认 URL
    if (!url) {
      url = searchQuery 
        ? `http://127.0.0.1:8000/api/books/?search=${encodeURIComponent(searchQuery)}`
        : 'http://127.0.0.1:8000/api/books/';
    }

    axios.get(url)
      .then(response => {
        // 适配分页响应结构
        if (response.data.results) {
          setBooks(response.data.results);
          setNextPage(response.data.next);
          setPrevPage(response.data.previous);
        } else {
          setBooks(response.data);
          setNextPage(null);
          setPrevPage(null);
        }
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

  const fetchBorrowHistory = (url) => {
    if (!url) {
      url = 'http://127.0.0.1:8000/api/books/borrow_history/';
    }
    
    axios.get(url)
      .then(response => {
        if (response.data.results) {
          setBorrowHistory(response.data.results);
          setHistoryNextPage(response.data.next);
          setHistoryPrevPage(response.data.previous);
        } else {
          setBorrowHistory(response.data);
          setHistoryNextPage(null);
          setHistoryPrevPage(null);
        }
      })
      .catch(err => {
        console.error("Error fetching history:", err);
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
      toast.success("注册成功！请登录。");
      setIsRegistering(false);
      setError(null);
    })
    .catch(err => {
      console.error("Register error:", err);
      toast.error("注册失败：" + JSON.stringify(err.response?.data));
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
    setSearchQuery('');
    setSelectedBook(null);
    toast.info("您已退出登录");
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
        
        // 如果在详情页，也更新详情页数据
        if (selectedBook && selectedBook.id === bookId) {
            setSelectedBook({
                ...selectedBook,
                quantity: response.data.quantity,
                user_status: response.data.user_status
            });
        }

        toast.success(`成功！您已借阅《${bookTitle}》`);
      })
      .catch(err => {
        console.error("Borrow error:", err);
        toast.error("借阅失败：" + (err.response?.data?.message || "未知错误"));
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

        // 如果在详情页，也更新详情页数据
        if (selectedBook && selectedBook.id === bookId) {
            setSelectedBook({
                ...selectedBook,
                quantity: response.data.quantity,
                user_status: response.data.user_status
            });
        }

        // 如果在个人主页，移除已归还的书籍
        if (view === 'profile' && profileTab === 'current') {
          // 注意：myBooks 现在包含的是借阅记录对象，其中包含 book 对象
          setMyBooks(prev => prev.filter(item => item.book.id !== bookId));
          // 刷新历史记录，因为归还后会产生新的历史
          fetchBorrowHistory();
        }

        toast.success(`成功！您已归还《${bookTitle}》`);
      })
      .catch(err => {
        console.error("Return error:", err);
        toast.error("归还失败：" + (err.response?.data?.message || "未知错误"));
      });
  };

  // 导航函数
  const navigateToProfile = () => {
    setView('profile');
    setProfileTab('current');
    fetchMyBooks();
    fetchBorrowHistory();
  };

  const navigateToHome = () => {
    setView('home');
    setSearchQuery('');
    setSelectedBook(null);
    // 清空搜索并重新获取第一页
    fetchBooks('http://127.0.0.1:8000/api/books/');
  };

  const navigateToDetail = (book) => {
    setSelectedBook(book);
    setView('detail');
  };

  // 处理搜索提交
  const handleSearch = (e) => {
    e.preventDefault();
    // 搜索时重置为第一页
    fetchBooks();
  };

  // 根据状态渲染按钮
  const renderButton = (book) => {
    if (book.user_status === 'BORROWED') {
      return (
        <button 
          className="btn btn-primary w-100" 
          onClick={(e) => {
            e.stopPropagation();
            handleReturn(book.id, book.title);
          }}
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
          onClick={(e) => {
            e.stopPropagation();
            handleBorrow(book.id, book.title);
          }}
        >
          借阅
        </button>
      );
    }
  };

  // 默认封面图片 URL
  const DEFAULT_COVER = "/book_cover.ico";

  // 如果未登录，显示登录/注册表单
  if (!user) {
    return (
      <div className="container mt-5" style={{ maxWidth: '400px' }}>
        <ToastContainer position="top-center" />
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
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 style={{cursor: 'pointer'}} onClick={navigateToHome}>📚 图书馆借书系统</h1>
        <div>
          <span className="me-3">
            欢迎, <button className="btn btn-link text-decoration-none fw-bold" onClick={navigateToProfile}>{user}</button>
          </span>
          <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>退出登录</button>
        </div>
      </div>
      
      {loading && (
        <div className="d-flex justify-content-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">加载中...</span>
          </div>
        </div>
      )}
      
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && view === 'home' && (
        <>
          <form onSubmit={handleSearch} className="mb-4">
            <div className="input-group">
              <input 
                type="text" 
                className="form-control" 
                placeholder="搜索书名、作者、ISBN、出版社或分类..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">搜索</button>
              {searchQuery && (
                <button 
                  className="btn btn-outline-secondary" 
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    fetchBooks('http://127.0.0.1:8000/api/books/');
                  }}
                >
                  清除
                </button>
              )}
            </div>
          </form>

          <div className="row">
            {books.map(book => (
              <div key={book.id} className="col-md-4 mb-4">
                <div className="card h-100 shadow-sm" style={{cursor: 'pointer'}} onClick={() => navigateToDetail(book)}>
                  <div className="row g-0">
                    <div className="col-4">
                      <img 
                        src={book.cover_image || DEFAULT_COVER} 
                        className="img-fluid rounded-start h-100" 
                        style={{objectFit: 'cover'}}
                        alt={book.title} 
                      />
                    </div>
                    <div className="col-8">
                      <div className="card-body">
                        <h5 className="card-title">{book.title}</h5>
                        <h6 className="card-subtitle mb-2 text-muted">{book.authors.map(a => a.name).join(', ')}</h6>
                        <p className="card-text text-truncate">{book.summary}</p>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge bg-primary">{book.categories.map(c => c.name).join(', ')}</span>
                          <small className="text-muted">库存: {book.quantity}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card-footer bg-transparent border-top-0">
                    {renderButton(book)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页控件 */}
          <div className="d-flex justify-content-center mt-4">
            <button 
              className="btn btn-outline-primary me-2" 
              disabled={!prevPage} 
              onClick={() => fetchBooks(prevPage)}
            >
              上一页
            </button>
            <button 
              className="btn btn-outline-primary" 
              disabled={!nextPage} 
              onClick={() => fetchBooks(nextPage)}
            >
              下一页
            </button>
          </div>
        </>
      )}

      {!loading && !error && view === 'profile' && (
        <div>
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${profileTab === 'current' ? 'active' : ''}`}
                onClick={() => setProfileTab('current')}
              >
                当前借阅
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${profileTab === 'history' ? 'active' : ''}`}
                onClick={() => setProfileTab('history')}
              >
                借阅历史
              </button>
            </li>
          </ul>

          {profileTab === 'current' && (
            <>
              {myBooks.length === 0 ? (
                <div className="alert alert-info">您当前没有借阅任何书籍。</div>
              ) : (
                <div className="row">
                  {myBooks.map(borrow => (
                    <div key={borrow.id} className={`col-md-4 mb-4`}>
                      <div className={`card h-100 shadow-sm ${borrow.is_overdue ? 'border-danger' : 'border-primary'}`}>
                        <div className="row g-0">
                          <div className="col-4">
                            <img 
                              src={borrow.book.cover_image || DEFAULT_COVER} 
                              className="img-fluid rounded-start h-100" 
                              style={{objectFit: 'cover'}}
                              alt={borrow.book.title} 
                            />
                          </div>
                          <div className="col-8">
                            <div className="card-body">
                              <h5 className="card-title">{borrow.book.title}</h5>
                              <h6 className="card-subtitle mb-2 text-muted">{borrow.book.authors.map(a => a.name).join(', ')}</h6>
                              
                              <div className="mt-3">
                                <p className="mb-1"><strong>借阅日期:</strong> {borrow.borrow_date}</p>
                                <p className={`mb-1 ${borrow.is_overdue ? 'text-danger fw-bold' : ''}`}>
                                  <strong>应还日期:</strong> {borrow.due_date}
                                  {borrow.is_overdue && <span className="badge bg-danger ms-2">已逾期</span>}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="card-footer bg-transparent border-top-0">
                          <button 
                            className="btn btn-primary w-100" 
                            onClick={() => handleReturn(borrow.book.id, borrow.book.title)}
                          >
                            归还
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {profileTab === 'history' && (
            <>
              {borrowHistory.length === 0 ? (
                <div className="alert alert-info">您还没有借阅历史记录。</div>
              ) : (
                <>
                  <div className="list-group">
                    {borrowHistory.map(history => (
                      <div key={history.id} className="list-group-item list-group-item-action">
                        <div className="d-flex w-100 justify-content-between">
                          <h5 className="mb-1">{history.book.title}</h5>
                          <small className="text-muted">已归还</small>
                        </div>
                        <p className="mb-1">
                          借阅于: {history.borrow_date} | 归还于: {history.return_date}
                        </p>
                        <small className="text-muted">作者: {history.book.authors.map(a => a.name).join(', ')}</small>
                      </div>
                    ))}
                  </div>
                  
                  {/* 历史记录分页 */}
                  <div className="d-flex justify-content-center mt-4">
                    <button 
                      className="btn btn-outline-secondary me-2 btn-sm" 
                      disabled={!historyPrevPage} 
                      onClick={() => fetchBorrowHistory(historyPrevPage)}
                    >
                      上一页
                    </button>
                    <button 
                      className="btn btn-outline-secondary btn-sm" 
                      disabled={!historyNextPage} 
                      onClick={() => fetchBorrowHistory(historyNextPage)}
                    >
                      下一页
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          
          <button className="btn btn-secondary mt-3" onClick={navigateToHome}>返回首页</button>
        </div>
      )}

      {!loading && !error && view === 'detail' && selectedBook && (
        <div className="card shadow-lg">
          <div className="row g-0">
            <div className="col-md-4">
              <img 
                src={selectedBook.cover_image || DEFAULT_COVER} 
                className="img-fluid rounded-start w-100" 
                alt={selectedBook.title} 
                style={{maxHeight: '600px', objectFit: 'contain', backgroundColor: '#f8f9fa'}}
              />
            </div>
            <div className="col-md-8">
              <div className="card-body">
                <h2 className="card-title mb-3">{selectedBook.title}</h2>
                <h5 className="text-muted mb-4">
                  作者: {selectedBook.authors.map(a => a.name).join(', ')}
                </h5>
                
                <div className="mb-4">
                  <h5>简介</h5>
                  <p className="card-text" style={{whiteSpace: 'pre-line'}}>{selectedBook.summary}</p>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <p><strong>ISBN:</strong> {selectedBook.isbn}</p>
                    <p><strong>出版社:</strong> {selectedBook.publisher.name}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>出版日期:</strong> {selectedBook.publication_date}</p>
                    <p><strong>分类:</strong> {selectedBook.categories.map(c => c.name).join(', ')}</p>
                  </div>
                </div>

                <div className="d-flex align-items-center mb-4">
                  <div className="me-4">
                    <strong>库存状态: </strong>
                    <span className={`badge ${selectedBook.quantity > 0 ? 'bg-success' : 'bg-secondary'}`}>
                      {selectedBook.quantity > 0 ? `剩余 ${selectedBook.quantity} 本` : '暂无库存'}
                    </span>
                  </div>
                </div>

                <div className="d-grid gap-2 d-md-block">
                  <div className="d-inline-block w-50 me-2">
                    {renderButton(selectedBook)}
                  </div>
                  <button className="btn btn-secondary" onClick={navigateToHome}>返回列表</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
