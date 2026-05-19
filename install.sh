#!/bin/bash

# Zashitus Installer
# Этот скрипт устанавливает сервис Zashitus и настраивает CLI-команду.

set -e

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Установка Zashitus ===${NC}"

# Проверка зависимостей
echo -n "Проверка Node.js... "
if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC} ($(node -v))"
else
    echo -e "${RED}Не найден${NC}"
    echo "Пожалуйста, установите Node.js (v20+) перед продолжением."
    exit 1
fi

echo -n "Проверка git... "
if command -v git >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Не найден${NC}"
    echo "Пожалуйста, установите git перед продолжением."
    exit 1
fi

# Определяем директорию установки
INSTALL_DIR="/opt/zashitus"
if [ ! -w "/opt" ]; then
    INSTALL_DIR="$HOME/zashitus"
fi

echo -e "Директория установки: ${BLUE}$INSTALL_DIR${NC}"

# Клонирование репозитория (если скрипт запущен не из склонированной папки)
if [ ! -f "package.json" ]; then
    echo "Клонирование репозитория..."
    git clone https://github.com/mikhail-root/zashitus.git "$INSTALL_DIR" --quiet
    cd "$INSTALL_DIR"
else
    INSTALL_DIR=$(pwd)
fi

# Установка зависимостей
echo "Установка зависимостей (это может занять время)..."
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
