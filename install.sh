#!/bin/bash

# Zashitus Installer
# Этот скрипт устанавливает сервис Zashitus и настраивает CLI-команду.

set -e

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
        sudo apt-get update -qq
        sudo apt-get install -y -qq nodejs npm git curl
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y -q nodejs npm git curl
    elif command -v brew >/dev/null 2>&1; then
        brew install node git curl
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
    echo -e "${GREEN}OK${NC} ($(node -v))"
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
    echo -e "\n${YELLOW}Отсутствуют необходимые компоненты: ${MISSING_DEPS[*]}${NC}"
    read -p "Хотите установить их автоматически? (y/n): " confirm
    if [[ "$confirm" == [yY] || "$confirm" == [yY][eE][sS] ]]; then
        install_dependencies
    else
        echo -e "\n${RED}Установка прервана.${NC}"
        echo "Для работы Zashitus необходимы:"
        echo "1. Node.js v20 или выше (и npm)"
        echo "2. Git"
        echo "3. Curl (для скачивания)"
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
    git clone https://github.com/mikhail-root/zashitus.git "$INSTALL_DIR" --quiet
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
    echo -e "${GREEN}Файл server/.env создан. Не забудьте указать API ключи!${NC}"
fi

# Настройка CLI команды
echo "Настройка команды 'zashitus'..."
chmod +x bin/zashitus

# Попытка создать симлинк в /usr/local/bin
if [ -w "/usr/local/bin" ]; then
    ln -sf "$INSTALL_DIR/bin/zashitus" /usr/local/bin/zashitus
    echo -e "${GREEN}Команда 'zashitus' доступна глобально!${NC}"
else
    echo -e "${RED}Нет прав на запись в /usr/local/bin.${NC}"
    echo "Вы можете запустить команду вручную: $INSTALL_DIR/bin/zashitus"
    echo "Или добавьте путь в PATH: export PATH=\$PATH:$INSTALL_DIR/bin"
fi

echo -e "\n${GREEN}=== Установка завершена успешно! ===${NC}"
echo -e "Используйте команды:"
echo -e "  ${BLUE}zashitus start${NC}    - запустить сайт"
echo -e "  ${BLUE}zashitus status${NC}   - проверить состояние"
echo -e "  ${BLUE}zashitus settings${NC} - настроить ключи ИИ (API_KEY)"
echo ""
