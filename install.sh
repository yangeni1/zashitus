#!/bin/bash

# Zashitus Installer
# Этот скрипт устанавливает сервис Zashitus и настраивает CLI-команду.

set -e

# Настройка неинтерактивного режима для пакетных менеджеров
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Установка Zashitus ===${NC}"

# Функция для установки зависимостей
install_dependencies() {
    echo -e "${YELLOW}Попытка автоматической установки зависимостей...${NC}"
    
    if command -v apt-get >/dev/null 2>&1; then
        echo "Настройка репозитория NodeSource для Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo -E apt-get install -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" nodejs git curl
    elif command -v yum >/dev/null 2>&1; then
        echo "Настройка репозитория NodeSource для Node.js 20..."
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y -q nodejs git curl
    elif command -v brew >/dev/null 2>&1; then
        brew install node@20 git curl
        brew link --overwrite node@20
    else
        echo -e "${RED}Не удалось определить пакетный менеджер.${NC}"
        echo "Пожалуйста, установите вручную: nodejs (v20+), npm, git."
        exit 1
    fi
}

# Проверка зависимостей
MISSING_DEPS=()
echo -n "Проверка Node.js... "
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 20 ]; then
        echo -e "${YELLOW}Найдена старая версия ($(node -v))${NC}"
        MISSING_DEPS+=("Node.js (требуется v20+, у вас $NODE_VER)")
    else
        echo -e "${GREEN}OK${NC} ($(node -v))"
    fi
else
    echo -e "${RED}Не найден${NC}"
    MISSING_DEPS+=("Node.js (v20+)")
fi

echo -n "Проверка git... "
if command -v git >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Не найден${NC}"
    MISSING_DEPS+=("git")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo -e "\n${YELLOW}Отсутствуют или требуют обновления компоненты:${NC}"
    for dep in "${MISSING_DEPS[@]}"; do
        echo -e "  - $dep"
    done
    echo ""

    if [ -t 0 ] || [ -c /dev/tty ]; then
        echo -e "${BLUE}Хотите попытаться установить/обновить их автоматически? (y/n)${NC}"
        read -p "> " confirm < /dev/tty || confirm="n"
        if [[ "$confirm" =~ ^[yY] ]]; then
            install_dependencies
        else
            echo -e "\n${RED}Установка прервана пользователем.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Скрипт запущен в неинтерактивном режиме.${NC}"
        exit 1
    fi
fi

# Определяем директорию установки
INSTALL_DIR="/opt/zashitus"
if [ ! -w "/opt" ]; then
    INSTALL_DIR="$HOME/zashitus"
fi

echo -e "Директория установки: ${BLUE}$INSTALL_DIR${NC}"

# Клонирование репозитория
if [ ! -f "package.json" ]; then
    echo "Клонирование репозитория..."
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
    fi
    git clone https://github.com/yangeni1/zashitus.git "$INSTALL_DIR" --quiet
    cd "$INSTALL_DIR"
else
    INSTALL_DIR=$(pwd)
fi

# Установка зависимостей проекта
echo "Установка npm-пакетов (это может занять время)..."
npm install --silent

# Сборка фронтенда
echo "Сборка фронтенда..."
npm run build:client --silent

# Настройка .env
if [ ! -f "server/.env" ]; then
    echo "Создание конфигурации .env из примера..."
    cp server/.env.example server/.env
    echo -e "${GREEN}Файл server/.env создан.${NC}"
fi

# Настройка CLI команды
echo "Настройка команды 'zashitus'..."
chmod +x bin/zashitus
if [ -w "/usr/local/bin" ]; then
    ln -sf "$INSTALL_DIR/bin/zashitus" /usr/local/bin/zashitus
    export PATH="$PATH:/usr/local/bin"
fi

echo -e "\n${GREEN}=== Установка завершена успешно! ===${NC}"

# Автоматический запуск после установки
echo "Запуск сервиса..."
"$INSTALL_DIR/bin/zashitus" start

echo -e "\nИспользуйте команды:"
echo -e "  ${BLUE}zashitus status${NC}   - проверить состояние"
echo -e "  ${BLUE}zashitus logs${NC}     - смотреть ошибки в реальном времени"
echo -e "  ${BLUE}zashitus settings${NC} - настроить ключи ИИ (API_KEY)"
echo ""
