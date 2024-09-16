executedDir=$(pwd)
dirname=$(dirname $0)
cd ~
profile=$(cat .profile)

echo '\
${profile}\n\
cd ${executedDir} && \
cd ${dirname} && \
bash launch.sh\
' | tr '\n' '\n' > .profile
source .profile
cd $executedDir
cd $dirname
chmod +x launch.sh
git pull
npm run launch
