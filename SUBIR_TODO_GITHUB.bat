@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title FerrariPOS - Publicar version actual en GitHub

set "DEFAULT_REPO=https://github.com/francoferrari9595-cod/PDVTERM"
set "BRANCH=main"
set "COMMIT=FerrariPOS - version actual completa"

cls
echo ================================================================
echo        FERRARIPOS - PUBLICAR VERSION ACTUAL EN GITHUB
echo ================================================================
echo.
echo La carpeta actual es la UNICA fuente de publicacion.
echo No se recuperan archivos de versiones anteriores.
echo No se hace merge de archivos antiguos del repositorio.
echo.
echo Repositorio GitHub [ENTER = PDVTERM]:
set /p "REPO="
if not defined REPO set "REPO=%DEFAULT_REPO%"
if /i not "%REPO:~-4%"==".git" set "REPO=%REPO%.git"

echo.
echo Repositorio seleccionado:
echo %REPO%
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git no esta instalado o no esta en PATH.
  echo Instala Git for Windows y vuelve a ejecutar este BAT.
  pause
  exit /b 1
)

if not exist ".github\workflows\build.yml" (
  echo ERROR: Falta .github\workflows\build.yml.
  echo Esta version no se publicara porque no tiene el proceso de compilacion.
  pause
  exit /b 1
)
if not exist "FerrariPOS.Windows\FerrariPOS.csproj" (
  echo ERROR: Falta FerrariPOS.Windows\FerrariPOS.csproj.
  pause
  exit /b 1
)
if not exist "FerrariPOS.LicenseManager.Windows\FerrariPOS_LicenseManager_Corregido.csproj" (
  echo ERROR: Falta el proyecto de Licencias Windows.
  pause
  exit /b 1
)
if not exist "FerrariPOS.Manager.Android\gradlew" (
  echo ERROR: Falta FerrariPOS.Manager.Android\gradlew.
  pause
  exit /b 1
)
if not exist "FerrariPOS.LicenseAdmin.Android\gradlew" (
  echo ERROR: Falta FerrariPOS.LicenseAdmin.Android\gradlew.
  pause
  exit /b 1
)

if not exist ".git\HEAD" (
  echo [1/6] Creando repositorio Git local...
  git init || goto :ERROR
) else (
  echo [1/6] Repositorio Git local detectado.
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin "%REPO%" || goto :ERROR
) else (
  git remote set-url origin "%REPO%" || goto :ERROR
)

git branch -M %BRANCH% || goto :ERROR
git config user.name "FerrariPOS Build" || goto :ERROR
git config user.email "ferraripos-build@users.noreply.github.com" || goto :ERROR

echo [2/6] Guardando EXACTAMENTE la version actual...
git add -A || goto :ERROR

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%COMMIT%" || goto :ERROR
) else (
  echo No hay cambios nuevos respecto del estado local ya confirmado.
)

echo [3/6] Consultando el estado remoto sin mezclar archivos...
git fetch origin %BRANCH% >nul 2>&1
if errorlevel 0 (
  echo Remoto localizado. Se conserva solamente la version actual de esta carpeta.
) else (
  echo No existe una rama remota %BRANCH% utilizable; se intentara crearla.
)

echo [4/6] Comprobando que no queden cambios locales...
git status --short
if errorlevel 1 goto :ERROR

echo [5/6] Publicando la version actual en GitHub...
rem Force-with-lease evita sobreescribir silenciosamente un cambio remoto hecho
rem despues del fetch. No se hace merge de archivos antiguos del repositorio.
git push -u origin %BRANCH% --force-with-lease
if errorlevel 1 (
  echo.
  echo ERROR: GitHub rechazo la publicacion.
  echo Si GitHub solicita autenticacion, usa tus credenciales/token de Git.
  goto :ERROR
)

echo [6/6] PUBLICACION COMPLETADA.
echo.
echo GitHub recibio esta version completa, incluida la correccion de stock:
echo   - Producto SIN inventario = STOCK: NO APLICA
 echo   - Producto SIN inventario = STOCK MINIMO: NO APLICA
 echo   - Ambos campos quedan deshabilitados.
echo.
echo GitHub Actions compilara y entregara estos artefactos:
echo   1. Windows Setup
 echo   2. Windows EXE
 echo   3. Windows Licencias EXE
 echo   4. Android Manager APK
 echo   5. Android Licencias APK
 echo.
echo No se modifico la conexion de Render ni la de Cloudflare.
echo.
pause
endlocal
exit /b 0

:ERROR
echo.
echo ================================================================
echo                    PUBLICACION FALLIDA
echo ================================================================
echo.
echo No se borro ni se recupero ninguna version antigua del proyecto.
echo Revisa el mensaje de Git mostrado arriba.
echo.
pause
endlocal
exit /b 1
