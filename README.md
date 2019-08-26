# node-red-contrib-prib-functions

[Node-Red][1] nodes for various functions:

*   Data Analysis
*	Test  
*   Load Injector
*	Monitor Fow
*	append
*	Spawn Process
*	Host Available
*	node.js os metrics

------------------------------------------------------------

## Data Analysis
A set of data analysis functions that can be run over an array of data

Single value metrics:
* Average
* Maximum
* Median
* Minimun
* Range
* Standard Deviation
* Skewness
* Sum
* Variance

Array metrics:
* Deltas
* Deltas Normalised
* Moving Average Simple (SMA)
* Moving Average Cumulative (CMA)
* Moving Average Weighted (WMA)
* Moving Average Exponential (EMA/EWMA)
* Normalise
* Standardization (Z-score Normalization)

![Data Analysis](documentation/DataAnalysis.JPG "Data Analysis")

example:

![Data Analysis example](documentation/DataAnalysisTest.JPG "Data Analysis example")

------------------------------------------------------------

## Test

Allows a test case for a message to allow simple testing of nodes. Injects a new message via mouse or message.cMessage sent to first port which can be consumed by other nodes and returned back to node in a loop. The Test node then checks against detailed expected payload result. 

![Test](documentation/Test.JPG "Test")

example:

![Test example](documentation/TestTest.JPG "Test example")

after run

![Test example run](documentation/TestTestRun.JPG "Test example run")

------------------------------------------------------------

## append

Append file(s) to payload. Cached to maximise performance.
Require can be used to find file.

![append](documentation/append.JPG "append")

Test example:

![append example](documentation/appendTest.JPG "append example")


------------------------------------------------------------

## Load Injector

Inject messages for a set period of time with varying think time.
Primary purpose is testing and useful for load/stress testing.

![Load Injector](documentation/LoadInjector.JPG "Load Injector")

Test example:

![Load Injector example](documentation/LoadInjectorTest.JPG "Load Injector example")


------------------------------------------------------------

## Monitor Flow

Add on wire between two flows to see message rates in status line.
Rate sampled every second and provides rate last second / 10 seconds / 1 minute / 5 minutes.

![Monitor Flow](documentation/MonitorFlow.JPG "Monitor Flow")

Test example:

![Monitor Flow example](documentation/MonitorFlowTest.JPG "Monitor Flow example")

------------------------------------------------------------

## Spawn Process

Spawn process as per node.js manual with ability to set working directory, environment variables
and argument passed to process. STDOUT and STDERR are sent as individual messages.
RC port is sent a message on closure.
Takes in messages that starts a process with ability to add environment values.
Message can be sent to kill the process.    

![Spawn Process](documentation/SpawnProcess.JPG "Spawn Process")

Test example:

![Spawn Process example](documentation/SpawnProcessTest.JPG "Spawn Process example")


------------------------------------------------------------

## Host Available

Test if host is available sending msg to up or down port so action can be taken.
Message only sent on state change or if message is sent which doesn't have topic refreshHostAvailable.
This topic forces a check rather than time check which can be set.

![Host Available](documentation/hostAvailable.JPG "Host Available")

Test example:

![Host Available example](documentation/hostAvailableTest.JPG "Host Available example")

------------------------------------------------------------

## os

The metrics from node.js os

![os](documentation/os.JPG "os")

Test example:

![os example](documentation/osTest.JPG "os example")

------------------------------------------------------------

# Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-prib-functions

# Tests

Test/example flow in test/generalTest.json

------------------------------------------------------------

# Version

0.7.0
* add Host Available

0.6.0
* add Spawn Process
* improve experimental transform with json to table html

0.5.0
* test node add select property tested for result
* dataAnalysis add property analysed 
* add experimental transform

0.4.0 Add test, monitor flow, data analysis

0.0.1 base

# Author

[Peter Prib][3]

[1]: http://nodered.org "node-red home page"

[2]: https://www.npmjs.com/package/node-red-contrib-prib-functions "source code"

[3]: https://github.com/peterprib "base github"
