// src/components/header.jsx
import styles from './header.module.css'
import LinkButton from './buttons/LinkButton.jsx'
import logoUrl from '../assets/logo.svg'

function  Header() {
    return (
        <header>
            <a href="/"  className={styles.flex}>
            <img src={logoUrl} alt="logo" />
            <h1 className={styles.title}>ЗАЩИТУС</h1>
            </a>
            <nav className={styles.flex_links}>
                <a href="/rules">Правила</a>
                <a href="/faq">FAQ</a>
                <a href="/about">О проекте</a>
                <a href="/contacts">Контакты</a>
            </nav>
            <div className={styles.flex_buttons}>
                <LinkButton href="/check">Пройти чек-лист</LinkButton>
                <LinkButton href="/hack" className='second-link'>Меня взломали</LinkButton>
            </div>
        </header>
    )
}
export default Header
