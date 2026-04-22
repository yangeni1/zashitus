// src/App.jsx
import './App.css' 
import Header from './components/header.jsx'
import LinkButton from './components/buttons/LinkButton.jsx'
import Footer from './components/footer.jsx'
function App() {
  return (
   <>
   <Header/>
      <main>

       <div className='container'>
        <div className='text_container'>
          <h2>Пройдите чек-лист и проверьте безопасность своего аккаунта</h2>
          <p>Это поможет защитить ваш аккаунт от взлома и настроить безопасность</p>
           <LinkButton href="/check" className='bigLink'>Пройти чек-лист</LinkButton>
        </div>
       </div>

       <div className='container_second'>
        <h3>Почему это важно</h3>
          <div className='flex_container'>
            <div  className='item_flex'>
              <h4>Взлом аккаунта</h4>
              <p>Основной текст</p>
            </div>
              <div  className='item_flex'>
                <h4>Фишинг</h4>
                <p>Основной текст</p>
              </div>
                <div  className='item_flex'>
                  <h4>Потеря данных</h4>
                  <p>Основной текст</p>
                </div>
            </div>
        </div>
        
                <div className='container_second'>
                  <h3>Причины опасности</h3>
                    <div className='flex_container'>
                      <div  className='item_flex'>
                        <h4>Слабые пароли</h4>
                        <p>Основной текст</p>
                      </div>
                        <div  className='item_flex'>
                          <h4>Отсутсвие 2FA</h4>
                          <p>Основной текст</p>
                        </div>
                          <div  className='item_flex'>
                            <h4>Подозрительные ссылки</h4>
                            <p>Основной текст</p>
                          </div>
                      </div>
                </div>
       
        <div className='container_second'>
            <h3>Краткие рекодмендации</h3>
            <div className='flex_container_second'>
              <div className='item_flex_second'>
                <p>Используйте сложные и уникальные пароли для каждого сервиса</p>
              </div>
              <div className='item_flex_second'>
                <p>Включите двухфакторную аутентификацию (2FA)</p>
              </div>
              <div className='item_flex_second'>
                <p>Не переходите по подозрительным ссылкам и сообщениям</p>
              </div>
              <div className='item_flex_second'>
                <p>Регулярно проверяйте активные сессии в аккаунтах</p>
              </div>
              <div className='item_flex_second'>
                <p>Не используйте один пароль для всех социальных сетей</p>
              </div>
              <div className='item_flex_second'>
                <p>Регулярно проверяйте активные сессии в аккаунтах</p>
              </div>
              <div className='item_flex_second'>
                <p>Обновляйте приложения и операционную систему</p>
              </div>
              <div className='item_flex_second'>
                <p>Не вводите данные на сторонних или неизвестных сайтах</p>
              </div>
            </div>
        </div>

        <div className='container_check'>
          <div className='item_check'>
            <h3>Проверьте безопасность своего аккаунта прямо сейчас</h3>
          </div>
          <div className='item_check'>
            <LinkButton href="/check" className='bigLink_bottom'>Пройти чек-лист</LinkButton>
          </div>
        </div>
      </main>
      <Footer />
   </>

      


  )
}

export default App