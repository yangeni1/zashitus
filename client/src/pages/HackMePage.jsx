import '../App.css'
import Header from '../components/header.jsx'
import LinkButton from '../components/buttons/LinkButton.jsx'
import Footer from '../components/footer.jsx'
function HackMePage() {
  return (
   <>
   <Header/>
      <main>
            <div className='container'>
        <div className='text_container'>
          <h2>Меня взломали — что делать?</h2>
          <p>Главное — не паникуйте. Как можно быстрее выполните эти действия. Так вы повысите шанс вернуть доступ к своим данным и лишить злоумышленника доступа.</p>
           <LinkButton href="/check" className='bigLink'>К действиям</LinkButton>
        </div>
       </div>

       <div className='container_second'>
            <h3>Основные действия</h3>
            <div className='flex_container_second'>
              <div className='faq_item'>
                <h4>Попробуйте сменить пароль</h4>
                <p>Если у вас всё ещё есть доступ к аккаунту, немедленно установите новый сложный пароль в настройках безопасности</p>
              </div>
              <div className='faq_item'>
                <h4>Завершите все сеансы</h4>
                <p>Найдите в настройках раздел «Активные сессии» или «Устройства» и нажмите «Завершить все другие сеансы». Это мгновенно разлогинит мошенника</p>
              </div>
              <div className='faq_item'>
                <h4>Проверьте данные для восстановления</h4>
                <p>Убедитесь, что к профилю привязаны именно ваша почта и ваш номер телефона. Если там чужие данные — немедленно их удалите</p>
              </div>
        </div>
        </div>

        <div className='container_second'>
        <h3>Обратитесь в поддержку</h3>
        <p className='social_text'>Если вы полностью потеряли доступ к вашему аккаунту,то сразу обращайтесь в официальную тех. поддержку соц. сети.</p>
        </div>

        <div className='container_social'>
            <div className='item_social'>
                <h3>ВКонтакте</h3>
                <img src="src/assets/VKLogo.png" alt="vklogo" />
                <LinkButton target="_blank" href="https://vk.com/support?act=home&source=dontpanic">Поддержка</LinkButton>
            </div>

            <div className='item_social'>
                <h3>Телеграм</h3>
                <img src="src/assets/telegramLogo.png" alt="telegramlogo" />
                <LinkButton target="_blank" href="https://telegram.org/support?setln=ru">Поддержка</LinkButton>
            </div>

            <div className='item_social'>
                <h3>Одноклассники</h3>
                <img src="src/assets/okLogo.png" alt="oklogo" />
                <LinkButton target="_blank" href="https://ok.ru/help/ask">Поддержка</LinkButton>
            </div>
        </div>
      </main>
      <Footer />
   </>

      


  )
}

export default HackMePage
