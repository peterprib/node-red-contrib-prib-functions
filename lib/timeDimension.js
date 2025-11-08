const timePeriod={second:1000}
timePeriod.minute=timePeriod.second*60
timePeriod.hour=timePeriod.minute*60
timePeriod.day=timePeriod.hour*24
timePeriod.week=timePeriod.day*7
timePeriod.fortnight=timePeriod.week*2

const isPeriod={
  second:t=>t%timePeriod.second,
  minute:t=>t%timePeriod.minute
}



const timeDimension=(period=timePeriod.second,from=0,to=60,call)=>{
  const fromDate=new Date(from).getMilliseconds%period
  const toDate=new Date(to).getMilliseconds%increment
  const periods=Object.keys(callFunctions)
  for(let i=fromDate;i<toDate;i+increment){
    call(i)
  }
}

const repeat=(r,call)=>{for(let i=0;i<r; i++) call(i)}
const secondsInMinute=call=>repeat(60,call)
const minutesInHour=repeat(60,call)
const hoursInDay=repeat(24,call)
const daysInWeek=repeat(7,call)

module.exports={
  repeat:repeat,
  secondsInMinute:secondsInMinute,
  minutesInHour:minutesInHour,
  hoursInDay:hoursInDay,
  daysInWeek:daysInWeek
}