import '../App.css'
import Header from '../components/header.jsx'
import LinkButton from '../components/buttons/LinkButton.jsx'
import Footer from '../components/footer.jsx'
function AboutPage() {
  return (
   <>
   <Header/>
      <main>
    <div className='container'>
        <div className='text_container'>
          <h2>Продукт создан в рамках проектного практикума</h2>
          <p>«Защитус» разработан студентами 1-го курса института радиоэлектроники и информационных технологий (УрФУ) и является учебным проектом. Мы всегда рады вашим предложениям по улучшению продукта на нашей почте.</p>
          <div className='flex'>
            <LinkButton href="/" className=''>На главную</LinkButton>
            <LinkButton href="/" className='second-link'>Написать на почту</LinkButton>
          </div>
           
        </div>
       </div>
      </main>
      <Footer />
   </>

      


  )
}

export default AboutPage
