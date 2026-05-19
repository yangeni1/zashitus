import '../App.css'
import Header from '../components/header.jsx'
import LinkButton from '../components/buttons/LinkButton.jsx'
import Footer from '../components/footer.jsx'
function CheckPage() {
  return (
   <>
   <Header/>
      <main>
    <div className='container_second'>
        <h3>Проверьте свою безопаность</h3>
        <p className='social_text'>Пройдите чек-лист с несколькими вопросами по безопасности, чтобы получить рекомендации по защите своих данных в соц. сетях, а также проверьте свои пароли на возможные уязвимости.</p>
        </div>

        <div className='check_container'>
            <div className='item_check'>
                <h3>Используете ли вы 2FA?</h3>
                <p>Метод двухфакторной аутентификации, защищает аккаунты от взлома: для входа нужно ввести не только логин и пароль, но и подтвердить личность вторым способом.</p>

    {/* notification succes */}
                {/* <div className='notification_success'>
                    <div>
                        <img src="/src/assets/check-circle.svg" alt="good" />
                    </div>
                    <div>
                        <span className='first_text_notifi'>Всё верно, 2FA необходим</span>
                        <br />
                        <span className='second_text_notifi'>Даже если злоумышленник узнает ваш пароль, он не сможет войти в аккаунт без второго ключа. </span>
                    </div>
                    <div>
                        <button><img src="/src/assets/close.svg" alt="close" /></button>
                    </div>
                </div> */}
{/*  */}
{/* notification error */}
<div className='notification_success error'>
                    <div>
                        <img src="/src/assets/close-circle.svg" alt="good" />
                    </div>
                    <div>
                        <span className='first_text_notifi'>Всё верно, 2FA необходим</span>
                        <br />
                        <span className='second_text_notifi'>Даже если злоумышленник узнает ваш пароль, он не сможет войти в аккаунт без второго ключа. </span>
                    </div>
                    <div>
                        <button><img src="/src/assets/close.svg" alt="close" /></button>
                    </div>
                </div>
                <div className='check_buttons_flex'>
                    <LinkButton href="/" className='second-link'>Да, использую</LinkButton>
                <LinkButton href="/">Нет, что это</LinkButton>
                {/* <LinkButton href="/">К следующему вопросу →</LinkButton> */}
                </div>
                
                <p className='count'>1/8</p>
            </div>
            <div className='item_check'>
                <h3>Проверьте уязвимость пароля</h3>
                <p>Злоумышленники регулярно осуществляют массовые взломы баз данных, из-за чего пароли «утекают» в сеть. Поэтому важно проверять, не оказался ли ваш пароль слит.</p>
                <div className='check_buttons_flex'>
                    <input type="text" placeholder='Введите пароль для проверки' />
                    <button> <img src="./src/assets/tabler-icon-zoom-check.svg" alt="поиск" /></button>
                </div>
                <p className='details'>*Для проверки используется сервис Have I Been Pwned. Он осуществляет поиск и сверяет ваш пароль со слитыми, не записывая его в базу.</p>
                
            </div>
        </div>
      </main>
      <Footer />
   </>

      


  )
}

export default CheckPage
