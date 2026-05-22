import { useState } from 'react'
import '../App.css'
import Header from '../components/header.jsx'
import LinkButton from '../components/buttons/LinkButton.jsx'
import Footer from '../components/footer.jsx'
import { questions } from './questions'
import checkCircle from '../assets/check-circle.svg'
import closeCircle from '../assets/close-circle.svg'
import closeIcon from '../assets/close.svg'
import zoomCheckIcon from '../assets/tabler-icon-zoom-check.svg'

function CheckPage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  
  const [password, setPassword] = useState('')
  const [passwordApiResult, setPasswordApiResult] = useState(null)
  const [isCheckingPassword, setIsCheckingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState(null)

  const currentQuestion = questions[currentQuestionIndex]

  // Password criteria logic
  const hasCyrillic = /[а-яёА-ЯЁ]/.test(password)
  const criteria = [
    { label: '12+ символов', met: password.length >= 12 },
    { label: 'Заглавные', met: /\p{Lu}/u.test(password) },
    { label: 'Строчные', met: /\p{Ll}/u.test(password) },
    { label: 'Цифры', met: /\d/.test(password) },
    { label: 'Спецсимволы', met: /[^\p{L}\p{N}]/u.test(password) }
  ]

  const handleAnswer = (answer, e) => {
    if (e) e.preventDefault()
    setFeedback({
      title: answer.feedbackTitle,
      text: answer.feedbackText,
      isCorrect: answer.isCorrect
    })
    if (answer.isCorrect) {
      setCorrectCount(prev => prev + 1)
    }
  }

  const nextQuestion = (e) => {
    if (e) e.preventDefault()
    setFeedback(null)
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      setIsFinished(true)
    }
  }

  const resetQuiz = (e) => {
    if (e) e.preventDefault()
    setCurrentQuestionIndex(0)
    setFeedback(null)
    setCorrectCount(0)
    setIsFinished(false)
  }

  const checkPasswordDeep = async () => {
    if (!password) return
    setIsCheckingPassword(true)
    setPasswordError(null)
    setPasswordApiResult(null)
    try {
      const response = await fetch('/api/password/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Ошибка при проверке')
      }

      const data = await response.json()
      setPasswordApiResult(data)
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setIsCheckingPassword(false)
    }
  }

  const getAiFallbackMessage = () => {
    const missed = criteria.filter(c => !c.met)
    
    if (missed.length === 0) {
      return "Ваш пароль соответствует всем базовым критериям безопасности. Он длинный и содержит разнообразные символы, что значительно усложняет взлом."
    }
    
    if (password.length < 12) {
      return "Пароль слишком короткий. Даже при наличии разных символов, короткие пароли уязвимы к быстрому перебору. Рекомендуем увеличить длину до 12+ знаков."
    }

    const nextStep = missed[0].label.toLowerCase()
    return `Хорошее начало, но для максимальной защиты стоит добавить в пароль ${nextStep}. Это сделает его структуру менее предсказуемой для алгоритмов взлома.`
  }

  const getFinalResult = () => {
    if (correctCount === questions.length) {
      return {
        title: `Вы отлично защищены (${correctCount}/${questions.length})`,
        text: 'Вы — продвинутый пользователь, который отлично понимает принципы работы с защитой личных данных в интернете.',
        isCorrect: true
      }
    } else if (correctCount >= 5) {
      return {
        title: `Хороший уровень защиты (${correctCount}/${questions.length})`,
        text: 'Вы знаете основы безопасности, но есть несколько моментов, которые стоит улучшить для полной защиты ваших аккаунтов.',
        isCorrect: true
      }
    } else {
      return {
        title: `Ваша безопасность под угрозой (${correctCount}/${questions.length})`,
        text: 'Рекомендуем внимательно изучить правила безопасности и настроить защиту своих аккаунтов как можно скорее.',
        isCorrect: false
      }
    }
  }

  const finalResult = isFinished ? getFinalResult() : null

  return (
   <>
   <Header/>
      <main>
    <div className='container_second'>
        <h3>Проверьте свою безопаность</h3>
        <p className='social_text'>Пройдите чек-лист с несколькими вопросами по безопасности, чтобы получить рекомендации по защите своих данных в соц. сетях, а также проверьте свои пароли на возможные уязвимости.</p>
        </div>

        <div className='check_container'>
            <div className='item_notification'>
                {!isFinished ? (
                    <>
                        <h3>{currentQuestion.question}</h3>
                        <p>{currentQuestion.description}</p>

                        {feedback && (
                            <div className={`notification_success ${feedback.isCorrect ? '' : 'error'}`}>
                                <div>
                                    <img src={feedback.isCorrect ? checkCircle : closeCircle} alt={feedback.isCorrect ? "good" : "bad"} />
                                </div>
                                <div>
                                    <span className='first_text_notifi'>{feedback.title}</span>
                                    <br />
                                    <span className='second_text_notifi'>{feedback.text}</span>
                                </div>
                                <div>
                                    <button onClick={() => setFeedback(null)}><img src={closeIcon} alt="close" /></button>
                                </div>
                            </div>
                        )}

                        {!feedback && (
                            <div className='check_buttons_flex'>
                                <LinkButton href="#" className='second-link' onClick={(e) => handleAnswer(currentQuestion.answers[0], e)}>
                                    {currentQuestion.answers[0].text}
                                </LinkButton>
                                <LinkButton href="#" onClick={(e) => handleAnswer(currentQuestion.answers[1], e)}>
                                    {currentQuestion.answers[1].text}
                                </LinkButton>
                            </div>
                        )}

                        {feedback && (
                            <div className='check_buttons_flex'>
                                <LinkButton href="#" onClick={nextQuestion}>
                                    {currentQuestionIndex < questions.length - 1 ? 'К следующему вопросу →' : 'Показать результат'}
                                </LinkButton>
                            </div>
                        )}
                        
                        <p className='count'>{currentQuestionIndex + 1}/{questions.length}</p>
                    </>
                ) : (
                    <>
                        <h3>Общая оценка безопасности</h3>
                        <p>Мы проанализировали ваши ответы и дали общую оценку уровню защищённости ваших данных от злоумышленников.</p>
                        <div className={`notification_success ${finalResult.isCorrect ? '' : 'error'}`}>
                            <div>
                                <img src={finalResult.isCorrect ? checkCircle : closeCircle} alt="result" />
                            </div>
                            <div>
                                <span className='first_text_notifi'>{finalResult.title}</span>
                                <br />
                                <span className='second_text_notifi'>{finalResult.text}</span>
                            </div>
                        </div>
                        <div className='check_buttons_flex' style={{ marginTop: '20px' }}>
                            <LinkButton href="#" onClick={resetQuiz}>Пройти чек-лист заново</LinkButton>
                            <LinkButton to="/" className='second-link'>На главную</LinkButton>
                        </div>
                    </>
                )}
            </div>

            <div className='item_notification'>
                <h3>Проверьте уязвимость пароля</h3>
                <p>Злоумышленники регулярно осуществляют массовые взломы баз данных, из-за чего пароли «утекают» в сеть. Поэтому важно проверять, не оказался ли ваш пароль слит.</p>
                
                {passwordApiResult && (
                    <div className={`notification_success ${passwordApiResult.pwned.isPwned ? 'error' : ''}`}>
                        <div>
                            <img src={passwordApiResult.pwned.isPwned ? closeCircle : checkCircle} alt="status" />
                        </div>
                        <div style={{ flexGrow: 1 }}>
                            <span className='first_text_notifi'>
                                {passwordApiResult.pwned.isPwned 
                                    ? `Ваш пароль обнаружен ${passwordApiResult.pwned.count.toLocaleString()} раз` 
                                    : 'Пароль не найден в базах утечек'}
                            </span>
                            <br />
                            <span className='second_text_notifi'>
                                {passwordApiResult.pwned.isPwned 
                                    ? 'Указанный пароль найден в нескольких слитых в сеть базах. Для обеспечения безопасности аккаунтов советуем срочно поменять пароль.'
                                    : 'Отлично! Ваш пароль не засветился в известных утечках данных.'}
                            </span>
                        </div>
                        <div>
                            <button onClick={() => setPasswordApiResult(null)}><img src={closeIcon} alt="close" /></button>
                        </div>
                    </div>
                )}

                {passwordError && (
                    <div className='notification_success error'>
                        <div><img src={closeCircle} alt="error" /></div>
                        <div>
                            <span className='first_text_notifi'>Ошибка проверки</span>
                            <br />
                            <span className='second_text_notifi'>{passwordError}</span>
                        </div>
                        <div>
                            <button onClick={() => setPasswordError(null)}><img src={closeIcon} alt="close" /></button>
                        </div>
                    </div>
                )}

                <div className='check_buttons_flex'>
                    <input 
                        type="text" 
                        placeholder='Введите пароль для проверки' 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={checkPasswordDeep} disabled={isCheckingPassword || !password}> 
                        <img src={zoomCheckIcon} alt="поиск" />
                    </button>
                </div>

                {hasCyrillic && (
                    <p style={{ margin: '8px 0 0 0', color: '#EF3C29', fontSize: '11px', fontWeight: 500 }}>
                        ⚠ Использование кириллицы в пароле может вызвать проблемы с авторизацией в некоторых сервисах. Рекомендуется использовать латиницу.
                    </p>
                )}

                {isCheckingPassword && (
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="loader" style={{ 
                            border: '2px solid #f3f3f3', 
                            borderTop: '2px solid #20297C', 
                            borderRadius: '50%', 
                            width: '20px', 
                            height: '20px', 
                            animation: 'spin 1s linear infinite' 
                        }}></div>
                        <span style={{ fontSize: '14px', color: '#20297C', fontWeight: 600 }}>Проводим глубокий анализ...</span>
                    </div>
                )}

                {!isCheckingPassword && !passwordApiResult && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                        {criteria.map((c, i) => (
                            <span key={i} style={{ 
                                fontSize: '11px', 
                                padding: '2px 8px', 
                                borderRadius: '10px',
                                backgroundColor: c.met ? '#E1FAE1' : '#f0f0f0',
                                color: c.met ? '#2E7D32' : '#8D8D8D',
                                border: `1px solid ${c.met ? '#30DB32' : '#E9E9E9'}`,
                                opacity: password.length > 0 ? 1 : 0.6,
                                transition: 'all 0.3s ease'
                            }}>
                                {c.met ? '✓' : '○'} {c.label}
                            </span>
                        ))}
                    </div>
                )}

                <p className='details'>*Для проверки используется сервис Have I Been Pwned. Он осуществляет поиск и сверяет ваш пароль со слитыми, не записывая его в базу.</p>
                
                {!isCheckingPassword && passwordApiResult && (
                    <div style={{ 
                        marginTop: '16px', 
                        padding: '16px', 
                        backgroundColor: '#f8f9ff', 
                        borderRadius: '12px', 
                        border: '1px solid #e1e4ff' 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '15px', color: '#20297C' }}>Результат анализа:</strong>
                            {passwordApiResult.ai?.status === 'completed' && (
                                <span style={{ fontSize: '10px', color: '#2E7D32', background: '#E1FAE1', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>AI АНАЛИЗ</span>
                            )}
                        </div>
                        
                        {passwordApiResult.ai?.status === 'completed' ? (
                            <p style={{ 
                                fontSize: '13px', 
                                margin: '4px 0', 
                                lineHeight: '1.5', 
                                color: '#333',
                                whiteSpace: 'pre-wrap' 
                            }}>
                                {passwordApiResult.ai.review.text}
                            </p>
                        ) : (
                            <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.5' }}>
                                <p style={{ margin: 0 }}>{getAiFallbackMessage()}</p>
                                <span style={{ display: 'block', fontSize: '11px', color: '#8D8D8D', marginTop: '8px' }}>
                                    {passwordApiResult.ai?.reason === 'daily_limit_exceeded' 
                                        ? '⚠ Лимит глубокого ИИ-анализа на сегодня исчерпан. Показана базовая оценка.' 
                                        : '⚠ Глубокий анализ временно недоступен. Показана базовая оценка.'}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </main>
      <Footer />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
   </>
  )
}

export default CheckPage
