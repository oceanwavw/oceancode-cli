@echo off
call "%~dp0..\lib\front_ends\oceandata_gui\venv-windows\Scripts\activate.bat"
python "%~dp0..\lib\front_ends\oceandata_gui\oceandata_gui\main.py"