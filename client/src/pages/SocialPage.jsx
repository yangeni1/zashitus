import '../App.css'
import Header from '../components/header.jsx'
import LinkButton from '../components/buttons/LinkButton.jsx'
import Footer from '../components/footer.jsx'

import VKLogo from '../assets/VKLogo.png'
import telegramLogo from '../assets/telegramLogo.png'
import okLogo from '../assets/okLogo.png'

function SocialPage() {
  return (
   <>
   <Header/>
      <main>
        <div className='container_second'>
        <h3>Инструкции по защите</h3>
        <p className='social_text'>Мы подготовили пошаговые инструкции по настройке безопасности для самых популярных соц. сетей. Выберите необходимую и выполните ряд действий, чтобы минимизировать риск взлома.</p>
        </div>

        <div className='container_social'>
            <div className='item_social'>
                <h3>ВКонтакте</h3>
                <img src={VKLogo} alt="vklogo" />
                <LinkButton href="/">Защитить</LinkButton>
            </div>

            <div className='item_social'>
                <h3>Телеграм</h3>
                <img src={telegramLogo} alt="telegramlogo" />
                <LinkButton href="/">Защитить</LinkButton>
            </div>

            <div className='item_social'>
                <h3>Одноклассники</h3>
                <img src={okLogo} alt="oklogo" />
                <LinkButton href="/">Защитить</LinkButton>
            </div>
        </div>
      </main>
      <Footer />
   </>

      


  )
}

export default SocialPage
