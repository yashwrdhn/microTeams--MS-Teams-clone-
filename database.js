

module.exports = {
  teams : [
    {
      id:1001,
      name:'team1',
      members:['yash','divyam','sahil'],
    },
    {
      id:1002,
      name:'team2',
      members:['yash2','divyam2','sahil2'],
    }
  ],
  assignments:[
      {
        id:1102,
        team:'team1',
        title:'assignment1',
        duedate:'12/07/21',
        tasks:'complete micro teams, host it and submit the solution'
      },
      {
        id:1101,
        team:'team1',
        title:'assignment2',
        duedate:'06/08/21',
        tasks:'explore azure communication services'
      },
      ],
  conversations:[
      {
        id:1201,
        team:'team1',
        title:'Team meeting @5.00pm',
        message:'Let\'s meet today and discuss about Agile methodology',
        replies: [
          {
            user:'john',
            message:'i cant make it',
          },
          {
            user:'jamie',
            message:'i will be there',
          }
        ],
      },

    ],
  users : [
    {
      id:1,
      name:'john',
      email:'john@gmail.com',
      teams:'team1',
      password:'johny',
    }
  ],

  notes:[
    {    
      title:'Note1',
      text:'this is some text for note1'
    },
      
    {
      title:'Note2',
      text:'this is some text for note2'
    },
      
    
  ]
}