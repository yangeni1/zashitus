// src/components/footer.jsx
import styles from './footer.module.css'
import logoNoFillUrl from '../assets/logo_no_fill.svg'

function  Footer() {
    return (
        <footer>
            <div>
                <a href="/"  className={styles.flex}>
                    <img src={logoNoFillUrl} alt="logo" />
                    <h1 className={styles.title}>ЗАЩИТУС</h1>
                </a>
                <div className={styles.contact}>
                    <b>Связаться с нами</b>
                    <p>contact@zashitus.ru</p>
                </div>
            </div>

            <div className={styles.sections}>
                <div className={styles.links}>
                    <h2>Разделы</h2>
                    <a href="/rules">Правила</a>
                    <a href="/faq">FAQ</a>
                    <a href="/about">О проекте</a>
                    <a href="/contacts">Контакты</a>
                </div>
                <div className={styles.links}>
                    <h2>Безопасность</h2>
                    <a href="/check">Пройти чек-лист</a>
                    <a href="/hack">Помощь при взломе</a>
                </div>
            </div>
            
        </footer>
    )
}
export default Footer
