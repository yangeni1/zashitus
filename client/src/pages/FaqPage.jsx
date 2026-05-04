import '../App.css'
import Header from '../components/header.jsx'
import LinkButton from '../components/buttons/LinkButton.jsx'
import Footer from '../components/footer.jsx'
function FaqPage() {
  return (
   <>
   <Header/>
      <main>
     <div className='container_second'>
            <h3>Часто задаваемые вопросы</h3>
            <div className='flex_container_second'>
              <div className='faq_item'>
                <h4>Зачем нужен пароль длиной 12+ символов?</h4>
                <p>Используйте сложные и уникальные пароли для каждого сервиса</p>
              </div>
              <div className='faq_item'>
                <h4>Нужно ли менять пароль каждые 3 месяца?</h4>
                <p>Нет, если пароль надежный и не был украден. Частая смена ведет к тому, что люди начинают выбирать простые и предсказуемые варианты. Главное — уникальный пароль для каждого сервиса.</p>
              </div>
              <div className='faq_item'>
                <h4>Безопасно ли заходить в соцсети через общественный Wi-Fi?</h4>
                <p>Только если вы используете VPN и у сайта есть значок замочка (HTTPS). В открытых сетях злоумышленники могут перехватить ваши данные.</p>
              </div>
              <div className='faq_item'>
                <h4>Можно ли взломать мой аккаунт, если у меня включена 2FA?</h4>
                <p>Это крайне сложно. Даже зная ваш пароль, хакеру понадобится физический доступ к вашему телефону или коду. Это самый надежный способ защиты на сегодня.</p>
              </div>
        </div>
        </div>

        <div className='container_check'>
          <div className='item_check'>
            <h3>Нет нужного вопроса?</h3>
            <h3>Отправьте вопрос на почту</h3>
          </div>
          <div className='item_check'>
            <LinkButton href="/check" className='bigLink_bottom'>Написать на почту</LinkButton>
          </div>
        </div>
      </main>
      <Footer />
   </>

      


  )
}

export default FaqPage
